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
const TRIP_KEY = 'shanghai-jinling-2026-10-19__2026-10-20';

const SEARCH = {
  q: 'Hotels near Dashijie Station Shanghai',
  checkIn: '2026-10-19',
  checkOut: '2026-10-20',
  adults: 2,
  children: 0,
  currency: 'VND',
  groupRoomsEstimate: 3,
  locationLabel: 'Jinling East Road · Dashijie · The Bund · Yu Garden, Shanghai',
  shortlist: [
    ['home inn plus', 'jinling east road'],
    ['jianguo', 'jinling east road'],
    ['campanile', 'bund'],
    ['crystal', 'jinling east road'],
    ['crystal orange', 'bund'],
    ['seventh heaven'],
    ['magnificent international'],
    ['autoongo', 'bund'],
    ['atour', 'dashijie'],
    ['ji hotel', 'jinling east road']
  ],
  fallbackHotels: [
    'Jianguo Puyin Hotel Shanghai Bund Jinling East Road',
    'Home Inn Plus Shanghai The Bund Jinling East Road',
    'Campanile Shanghai Bund Hotel',
    'JI Hotel Shanghai The Bund Jinling East Road',
    'Crystal Shanghai Bund Jinling East Road Hotel',
    'Crystal Orange Shanghai The Bund Yu Garden Hotel',
    'Seventh Heaven Hotel',
    'Magnificent International Hotel',
    'Shanghai Autoongo Bund Hotel',
    'Atour Light Hotel Shanghai Bund Dashijie Metro Station'
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

function isShortlisted(name) {
  const normalized = normalize(name);
  return SEARCH.shortlist.some(parts => parts.every(part => normalized.includes(normalize(part))));
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
  const amount = finiteNumber(price.extracted_lowest);
  if (amount === null) return null;
  return {
    amount,
    formatted: price.lowest || `${amount} ${SEARCH.currency}`,
    before_taxes_fees_amount: finiteNumber(price.extracted_before_taxes_fees),
    before_taxes_fees_formatted: price.before_taxes_fees || null
  };
}

function compactSources(prices) {
  return (Array.isArray(prices) ? prices : [])
    .map(item => {
      const rate = compactPrice(item?.rate_per_night);
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

function compactProperty(raw) {
  let rate = compactPrice(raw?.rate_per_night);
  const totalRate = compactPrice(raw?.total_rate);
  if (!rate && totalRate) rate = totalRate;

  const image = Array.isArray(raw?.images)
    ? raw.images.find(item => item?.thumbnail || item?.original_image)
    : null;
  const id = propertyId(raw);
  const priceSources = compactSources(raw?.prices);
  if (!rate && priceSources[0]?.rate_per_night) rate = priceSources[0].rate_per_night;
  const amount = finiteNumber(rate?.amount);

  return {
    id,
    property_token: raw?.property_token || null,
    name: raw?.name || 'Hotel',
    description: raw?.description || null,
    shortlisted: isShortlisted(raw?.name),
    website_url: raw?.link || null,
    image_url: image?.thumbnail || image?.original_image || raw?.thumbnail || null,
    coordinates: raw?.gps_coordinates || null,
    check_in_time: raw?.check_in_time || null,
    check_out_time: raw?.check_out_time || null,
    hotel_class: raw?.hotel_class || null,
    stars: finiteNumber(raw?.extracted_hotel_class ?? raw?.hotel_class),
    overall_rating: finiteNumber(raw?.overall_rating),
    reviews: finiteNumber(raw?.reviews),
    location_rating: finiteNumber(raw?.location_rating),
    amenities: (Array.isArray(raw?.amenities) ? raw.amenities : []).slice(0, 10),
    rate_per_night: amount === null ? null : { ...rate, amount, currency: SEARCH.currency },
    total_rate: totalRate ? { ...totalRate, currency: SEARCH.currency } : null,
    estimated_three_rooms_amount: amount === null ? null : amount * SEARCH.groupRoomsEstimate,
    price_sources: priceSources,
    price_status: amount === null ? 'unavailable' : 'priced',
    catalogue_fallback: false
  };
}

function fallbackProperty(name) {
  return {
    id: `fallback:${normalize(name)}`,
    property_token: null,
    name,
    description: 'Khách sạn trong danh sách theo dõi quanh Jinling East Road / Dashijie.',
    shortlisted: true,
    website_url: null,
    image_url: null,
    coordinates: null,
    check_in_time: null,
    check_out_time: null,
    hotel_class: null,
    stars: null,
    overall_rating: null,
    reviews: null,
    location_rating: null,
    amenities: [],
    rate_per_night: null,
    total_rate: null,
    estimated_three_rooms_amount: null,
    price_sources: [],
    price_status: 'unavailable',
    catalogue_fallback: true
  };
}

function namesLikelyMatch(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  return left === right || left.includes(right) || right.includes(left);
}

function compareRecommended(a, b) {
  if (a.shortlisted !== b.shortlisted) return a.shortlisted ? -1 : 1;
  const priceDiff = priceAmount(a) - priceAmount(b);
  if (Number.isFinite(priceDiff) && priceDiff !== 0) return priceDiff;
  if (a.catalogue_fallback !== b.catalogue_fallback) return a.catalogue_fallback ? 1 : -1;
  return a.name.localeCompare(b.name, 'en');
}

const previous = await readJson(OUT, null);
const oldHistory = await readJson(HISTORY, []);
const generatedAt = new Date().toISOString();

console.log(`Searching Google Hotels: ${SEARCH.locationLabel} · ${SEARCH.checkIn} → ${SEARCH.checkOut}...`);
const body = await serpapi({
  engine: 'google_hotels',
  q: SEARCH.q,
  check_in_date: SEARCH.checkIn,
  check_out_date: SEARCH.checkOut,
  adults: SEARCH.adults,
  children: SEARCH.children,
  currency: SEARCH.currency,
  hl: 'en',
  gl: 'vn'
});

const rawProperties = [
  ...(Array.isArray(body?.properties) ? body.properties : []),
  ...(Array.isArray(body?.non_matching_properties) ? body.non_matching_properties : [])
];

console.log(`SerpApi returned ${rawProperties.length} hotel properties before price filtering.`);

const seen = new Set();
const properties = rawProperties
  .map(compactProperty)
  .filter(property => {
    const key = property.id || normalize(property.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

for (const name of SEARCH.fallbackHotels) {
  if (!properties.some(property => namesLikelyMatch(property.name, name))) {
    properties.push(fallbackProperty(name));
  }
}

properties.sort(compareRecommended);
const limitedProperties = properties.slice(0, 30);
const previousProperties = Array.isArray(previous?.properties) ? previous.properties : [];

for (const property of limitedProperties) {
  const currentAmount = finiteNumber(property?.rate_per_night?.amount);
  const old = previousProperties.find(item =>
    item?.id === property.id || normalize(item?.name) === normalize(property.name)
  );
  const previousAmount = finiteNumber(old?.rate_per_night?.amount);
  if (currentAmount !== null && previousAmount !== null) {
    property.previous_rate_per_night_amount = previousAmount;
    property.price_delta = currentAmount - previousAmount;
  } else {
    property.previous_rate_per_night_amount = previousAmount;
    property.price_delta = null;
  }
}

const pricedProperties = limitedProperties.filter(item => finiteNumber(item?.rate_per_night?.amount) !== null);
const cheapest = [...pricedProperties].sort((a, b) => priceAmount(a) - priceAmount(b))[0] || null;
const cheapestShortlisted = [...pricedProperties]
  .filter(item => item.shortlisted)
  .sort((a, b) => priceAmount(a) - priceAmount(b))[0] || null;

const result = {
  status: pricedProperties.length ? 'ok' : limitedProperties.length ? 'partial' : 'no_results',
  provider: 'SerpApi',
  source: 'Google Hotels',
  generated_at: generatedAt,
  live_mode: true,
  disclaimer: 'Rates are Google Hotels snapshots for one room with 2 adults. Hotels may remain visible even when Google Hotels does not return a live rate. Taxes, fees, room type and final checkout price can differ. The 3-room figure is only a simple estimate for the 6-adult group and does not confirm availability of three identical rooms.',
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
    searches_per_refresh: 1,
    google_hotels_url: body?.search_metadata?.google_hotels_url || null,
    raw_property_count: rawProperties.length,
    displayed_property_count: limitedProperties.length,
    priced_property_count: pricedProperties.length
  },
  properties: limitedProperties,
  cheapest_property_id: cheapest?.id || null,
  cheapest_shortlisted_property_id: cheapestShortlisted?.id || null
};

const newHistory = pricedProperties.map(property => ({
  checked_at: generatedAt,
  trip_key: TRIP_KEY,
  property_id: property.id,
  name: property.name,
  shortlisted: property.shortlisted,
  rate_per_night_amount: property.rate_per_night.amount,
  currency: SEARCH.currency,
  lowest_source: property.price_sources?.[0]?.source || null,
  provider: 'SerpApi',
  source: 'Google Hotels'
}));

const history = [...(Array.isArray(oldHistory) ? oldHistory : []), ...newHistory].slice(-2400);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(result, null, 2) + '\n');
await fs.writeFile(HISTORY, JSON.stringify(history, null, 2) + '\n');

console.log(`Saved ${OUT} with ${limitedProperties.length} displayed properties; ${pricedProperties.length} currently have live prices.`);
if (cheapest) {
  console.log(`Cheapest: ${cheapest.name} · ${cheapest.rate_per_night.amount} ${SEARCH.currency}/room/night`);
}
if (cheapestShortlisted) {
  console.log(`Cheapest shortlist: ${cheapestShortlisted.name} · ${cheapestShortlisted.rate_per_night.amount} ${SEARCH.currency}/room/night`);
}
