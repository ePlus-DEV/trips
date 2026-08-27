import fs from 'node:fs/promises';
import path from 'node:path';

const API_KEY = process.env.SERPAPI_API_KEY;
if (!API_KEY) {
  console.error('Missing SERPAPI_API_KEY. Add it as a GitHub Actions repository secret.');
  process.exit(2);
}

const API = 'https://serpapi.com/search.json';
const OUT = path.resolve('data/hotels.json');
const HISTORY = path.resolve('data/hotel-history.json');
const TRIP_KEY = 'shanghai-2026-10-19__2026-10-20';
const requestedPages = Number(process.env.HOTEL_MAX_PAGES || 3);
const MAX_PAGES = Number.isFinite(requestedPages) ? Math.min(8, Math.max(1, Math.trunc(requestedPages))) : 3;
const MAX_CATALOG = 180;

const SEARCH = {
  q: 'Shanghai hotels',
  checkIn: '2026-10-19',
  checkOut: '2026-10-20',
  adults: 2,
  children: 0,
  currency: 'VND',
  groupRoomsEstimate: 3,
  maxPages: MAX_PAGES,
  locationLabel: 'Shanghai · lọc theo khoảng cách từ 531 Jinling East Road',
  anchor: {
    name: '531 Jinling East Road',
    latitude: 31.2285,
    longitude: 121.4808
  },
  areas: [
    { name: 'Dashijie / Jinling East Road', latitude: 31.2288, longitude: 121.4799 },
    { name: "People's Square", latitude: 31.2304, longitude: 121.4737 },
    { name: 'Yu Garden', latitude: 31.2270, longitude: 121.4920 },
    { name: 'The Bund', latitude: 31.2397, longitude: 121.4908 },
    { name: 'Nanjing Road', latitude: 31.2354, longitude: 121.4757 }
  ]
};

function normalize(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim();
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function priceAmount(property) {
  const amount = finiteNumber(property?.rate_per_night?.amount);
  return amount === null ? Number.POSITIVE_INFINITY : amount;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const lat1 = finiteNumber(aLat);
  const lon1 = finiteNumber(aLon);
  const lat2 = finiteNumber(bLat);
  const lon2 = finiteNumber(bLon);
  if ([lat1, lon1, lat2, lon2].some(value => value === null)) return null;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestArea(coordinates) {
  const lat = finiteNumber(coordinates?.latitude);
  const lon = finiteNumber(coordinates?.longitude);
  if (lat === null || lon === null) return { name: 'Không rõ khu vực', distance_km: null };
  const ranked = SEARCH.areas
    .map(area => ({ ...area, distance_km: distanceKm(lat, lon, area.latitude, area.longitude) }))
    .filter(area => area.distance_km !== null)
    .sort((a, b) => a.distance_km - b.distance_km);
  if (!ranked.length || ranked[0].distance_km > 4) {
    return { name: 'Khu vực khác ở Shanghai', distance_km: ranked[0]?.distance_km ?? null };
  }
  return { name: ranked[0].name, distance_km: ranked[0].distance_km };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

async function serpapi(params) {
  const url = new URL(API);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  url.searchParams.set('api_key', API_KEY);

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = { raw: text }; }

  if (!response.ok || body?.error) {
    throw new Error(`SerpApi request failed: ${body?.error || `HTTP ${response.status}`}`);
  }
  if (body?.search_metadata?.status && body.search_metadata.status !== 'Success') {
    throw new Error(`SerpApi search did not complete successfully: ${body.search_metadata.status}`);
  }
  return body;
}

function compactPrice(price) {
  if (!price) return null;
  const amount = finiteNumber(price.extracted_lowest ?? price.extracted_price ?? price.amount);
  if (amount === null) return null;
  return {
    amount,
    formatted: price.lowest || price.price || `${amount} ${SEARCH.currency}`,
    before_taxes_fees_amount: finiteNumber(price.extracted_before_taxes_fees),
    before_taxes_fees_formatted: price.before_taxes_fees || null
  };
}

function compactSources(prices) {
  return (Array.isArray(prices) ? prices : [])
    .map(item => {
      const rate = compactPrice(item?.rate_per_night || item);
      return rate ? {
        source: item?.source || 'Unknown source',
        logo: item?.logo || null,
        link: item?.link || null,
        rate_per_night: { ...rate, currency: SEARCH.currency }
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.rate_per_night.amount - b.rate_per_night.amount)
    .slice(0, 8);
}

function propertyId(raw) {
  return raw?.property_token || `name:${normalize(raw?.name || 'hotel')}`;
}

function compactProperty(raw, generatedAt) {
  let rate = compactPrice(raw?.rate_per_night);
  const totalRate = compactPrice(raw?.total_rate);
  const priceSources = compactSources(raw?.prices);
  if (!rate && priceSources[0]?.rate_per_night) rate = priceSources[0].rate_per_night;
  if (!rate && totalRate) rate = totalRate;

  const amount = finiteNumber(rate?.amount);
  const image = Array.isArray(raw?.images)
    ? raw.images.find(item => item?.thumbnail || item?.original_image)
    : null;
  const coordinates = raw?.gps_coordinates || null;
  const distance = distanceKm(
    coordinates?.latitude,
    coordinates?.longitude,
    SEARCH.anchor.latitude,
    SEARCH.anchor.longitude
  );
  const area = nearestArea(coordinates);

  return {
    id: propertyId(raw),
    property_token: raw?.property_token || null,
    name: raw?.name || 'Hotel',
    description: raw?.description || null,
    address: raw?.address || null,
    website_url: raw?.link || null,
    image_url: image?.thumbnail || image?.original_image || raw?.thumbnail || null,
    coordinates,
    distance_from_anchor_km: distance === null ? null : Number(distance.toFixed(2)),
    area: area.name,
    area_is_estimate: true,
    check_in_time: raw?.check_in_time || null,
    check_out_time: raw?.check_out_time || null,
    hotel_class: raw?.hotel_class || null,
    stars: finiteNumber(raw?.extracted_hotel_class),
    overall_rating: finiteNumber(raw?.overall_rating),
    reviews: finiteNumber(raw?.reviews),
    location_rating: finiteNumber(raw?.location_rating),
    amenities: (Array.isArray(raw?.amenities) ? raw.amenities : []).slice(0, 20),
    rate_per_night: amount === null ? null : { ...rate, amount, currency: SEARCH.currency },
    total_rate: totalRate ? { ...totalRate, currency: SEARCH.currency } : null,
    estimated_three_rooms_amount: amount === null ? null : amount * SEARCH.groupRoomsEstimate,
    price_sources: priceSources,
    price_status: amount === null ? 'unavailable' : 'priced',
    seen_in_latest_search: true,
    last_seen_at: generatedAt
  };
}

function compareRecommended(a, b) {
  const currentA = a.seen_in_latest_search !== false;
  const currentB = b.seen_in_latest_search !== false;
  if (currentA !== currentB) return currentA ? -1 : 1;
  const pricedA = priceAmount(a) !== Number.POSITIVE_INFINITY;
  const pricedB = priceAmount(b) !== Number.POSITIVE_INFINITY;
  if (pricedA !== pricedB) return pricedA ? -1 : 1;
  const distanceA = finiteNumber(a.distance_from_anchor_km) ?? Number.POSITIVE_INFINITY;
  const distanceB = finiteNumber(b.distance_from_anchor_km) ?? Number.POSITIVE_INFINITY;
  if (distanceA !== distanceB) return distanceA - distanceB;
  const ratingDiff = (finiteNumber(b.overall_rating) ?? 0) - (finiteNumber(a.overall_rating) ?? 0);
  if (ratingDiff) return ratingDiff;
  return priceAmount(a) - priceAmount(b) || a.name.localeCompare(b.name, 'en');
}

function staleCatalogProperty(property, previousGeneratedAt) {
  return {
    ...property,
    rate_per_night: null,
    total_rate: null,
    estimated_three_rooms_amount: null,
    price_sources: [],
    price_status: 'not_refreshed',
    previous_rate_per_night_amount: finiteNumber(property?.rate_per_night?.amount),
    price_delta: null,
    seen_in_latest_search: false,
    last_seen_at: property?.last_seen_at || previousGeneratedAt || null
  };
}

const previous = await readJson(OUT, null);
const oldHistory = await readJson(HISTORY, []);
const generatedAt = new Date().toISOString();

console.log(`Discovering Google Hotels for Shanghai · ${SEARCH.checkIn} → ${SEARCH.checkOut} · max ${SEARCH.maxPages} page(s)...`);
const rawProperties = [];
let nextPageToken = null;
let pagesFetched = 0;
let googleHotelsUrl = null;

for (let page = 1; page <= SEARCH.maxPages; page += 1) {
  const body = await serpapi({
    engine: 'google_hotels',
    q: SEARCH.q,
    check_in_date: SEARCH.checkIn,
    check_out_date: SEARCH.checkOut,
    adults: SEARCH.adults,
    children: SEARCH.children,
    currency: SEARCH.currency,
    hl: 'en',
    gl: 'vn',
    next_page_token: nextPageToken || undefined
  });

  pagesFetched += 1;
  if (!googleHotelsUrl) googleHotelsUrl = body?.search_metadata?.google_hotels_url || null;
  const pageProperties = [
    ...(Array.isArray(body?.properties) ? body.properties : []),
    ...(Array.isArray(body?.non_matching_properties) ? body.non_matching_properties : [])
  ];
  rawProperties.push(...pageProperties);
  console.log(`Page ${page}: ${pageProperties.length} properties.`);

  nextPageToken = body?.serpapi_pagination?.next_page_token || null;
  if (!nextPageToken) break;
}

if (!rawProperties.length) {
  console.error('ZERO_RESULTS: Google Hotels returned 0 properties. Refusing to overwrite the last good hotel snapshot.');
  process.exit(10);
}

const seen = new Set();
const currentProperties = rawProperties
  .map(raw => compactProperty(raw, generatedAt))
  .filter(property => {
    const key = property.property_token || normalize(property.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

const previousProperties = (
  previous?.search?.trip_key === TRIP_KEY && Array.isArray(previous?.properties)
    ? previous.properties
    : []
).filter(property => !property?.catalogue_fallback && property?.id);

const preservedProperties = [];
for (const property of previousProperties) {
  const key = property.property_token || normalize(property.name);
  if (!seen.has(key)) {
    preservedProperties.push(staleCatalogProperty(property, previous?.generated_at));
    seen.add(key);
  }
}

const properties = [...currentProperties, ...preservedProperties]
  .sort(compareRecommended)
  .slice(0, MAX_CATALOG);

for (const property of properties) {
  if (property.seen_in_latest_search === false) continue;
  const currentAmount = finiteNumber(property?.rate_per_night?.amount);
  const old = previousProperties.find(item =>
    item?.id === property.id || normalize(item?.name) === normalize(property.name)
  );
  const previousAmount = finiteNumber(old?.rate_per_night?.amount);
  property.previous_rate_per_night_amount = previousAmount;
  property.price_delta = currentAmount !== null && previousAmount !== null
    ? currentAmount - previousAmount
    : null;
}

const pricedProperties = currentProperties.filter(item => finiteNumber(item?.rate_per_night?.amount) !== null);
const cheapest = [...pricedProperties].sort((a, b) => priceAmount(a) - priceAmount(b))[0] || null;

const result = {
  status: pricedProperties.length ? 'ok' : 'partial',
  snapshot_schema: 2,
  provider: 'SerpApi',
  source: 'Google Hotels',
  generated_at: generatedAt,
  live_mode: true,
  disclaimer: 'Discovery starts from a broad Shanghai hotels search. Filtering by distance, price, rating, reviews, stars, area and amenities happens in the browser. Rates are Google Hotels snapshots for one room with 2 adults; taxes, fees, room type and final checkout price can differ. Hotels preserved from a deeper prior discovery remain visible but their old prices are intentionally cleared unless they are seen in the latest refresh.',
  search: {
    trip_key: TRIP_KEY,
    query: SEARCH.q,
    location_label: SEARCH.locationLabel,
    check_in_date: SEARCH.checkIn,
    check_out_date: SEARCH.checkOut,
    nights: 1,
    adults_per_room: SEARCH.adults,
    children: SEARCH.children,
    currency: SEARCH.currency,
    group_rooms_estimate: SEARCH.groupRoomsEstimate,
    anchor: SEARCH.anchor,
    max_pages: SEARCH.maxPages,
    pages_fetched: pagesFetched,
    searches_per_refresh: pagesFetched,
    google_hotels_url: googleHotelsUrl,
    raw_property_count: rawProperties.length,
    latest_unique_property_count: currentProperties.length,
    preserved_catalog_count: preservedProperties.length,
    displayed_property_count: properties.length,
    priced_property_count: pricedProperties.length
  },
  properties,
  cheapest_property_id: cheapest?.id || null,
  cheapest_shortlisted_property_id: null
};

const newHistory = pricedProperties.map(property => ({
  checked_at: generatedAt,
  trip_key: TRIP_KEY,
  property_id: property.id,
  name: property.name,
  rate_per_night_amount: property.rate_per_night.amount,
  currency: SEARCH.currency,
  lowest_source: property.price_sources?.[0]?.source || null,
  provider: 'SerpApi',
  source: 'Google Hotels'
}));

const history = [...(Array.isArray(oldHistory) ? oldHistory : []), ...newHistory].slice(-4000);
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(result, null, 2) + '\n');
await fs.writeFile(HISTORY, JSON.stringify(history, null, 2) + '\n');

console.log(`Saved ${OUT}: ${currentProperties.length} unique hotels from latest search, ${preservedProperties.length} preserved from catalog, ${pricedProperties.length} with live prices, ${pagesFetched} API page(s).`);
if (cheapest) {
  console.log(`Cheapest: ${cheapest.name} · ${cheapest.rate_per_night.amount} ${SEARCH.currency}/room/night`);
}
