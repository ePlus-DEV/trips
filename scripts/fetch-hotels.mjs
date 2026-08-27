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
  q: 'Jinling East Road Shanghai hotels',
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
    ['seventh heaven'],
    ['magnificent international'],
    ['autoongo', 'bund'],
    ['atour', 'dashijie']
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
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
        rate_per_night: rate
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
  const rate = compactPrice(raw?.rate_per_night);
  if (!rate) return null;
  const totalRate = compactPrice(raw?.total_rate);
  const image = Array.isArray(raw?.images) ? raw.images.find(item => item?.thumbnail || item?.original_image) : null;
  const id = propertyId(raw);

  return {
    id,
    property_token: raw?.property_token || null,
    name: raw?.name || 'Hotel',
    description: raw?.description || null,
    shortlisted: isShortlisted(raw?.name),
    website_url: raw?.link || null,
    image_url: image?.thumbnail || image?.original_image || null,
    coordinates: raw?.gps_coordinates || null,
    check_in_time: raw?.check_in_time || null,
    check_out_time: raw?.check_out_time || null,
    hotel_class: raw?.hotel_class || null,
    stars: finiteNumber(raw?.extracted_hotel_class),
    overall_rating: finiteNumber(raw?.overall_rating),
    reviews: finiteNumber(raw?.reviews),
    location_rating: finiteNumber(raw?.location_rating),
    amenities: (Array.isArray(raw?.amenities) ? raw.amenities : []).slice(0, 10),
    rate_per_night: {
      ...rate,
      currency: SEARCH.currency
    },
    total_rate: totalRate ? { ...totalRate, currency: SEARCH.currency } : null,
    estimated_three_rooms_amount: rate.amount * SEARCH.groupRoomsEstimate,
    price_sources: compactSources(raw?.prices)
  };
}

function compareRecommended(a, b) {
  if (a.shortlisted !== b.shortlisted) return a.shortlisted ? -1 : 1;
  return a.rate_per_night.amount - b.rate_per_night.amount;
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

const seen = new Set();
const properties = rawProperties
  .map(compactProperty)
  .filter(Boolean)
  .filter(property => {
    const key = property.id || normalize(property.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort(compareRecommended)
  .slice(0, 20);

const previousProperties = Array.isArray(previous?.properties) ? previous.properties : [];
for (const property of properties) {
  const old = previousProperties.find(item =>
    item?.id === property.id || normalize(item?.name) === normalize(property.name)
  );
  const previousAmount = finiteNumber(old?.rate_per_night?.amount);
  if (previousAmount !== null) {
    property.previous_rate_per_night_amount = previousAmount;
    property.price_delta = property.rate_per_night.amount - previousAmount;
  } else {
    property.previous_rate_per_night_amount = null;
    property.price_delta = null;
  }
}

const cheapest = [...properties].sort((a, b) => a.rate_per_night.amount - b.rate_per_night.amount)[0] || null;
const cheapestShortlisted = [...properties]
  .filter(item => item.shortlisted)
  .sort((a, b) => a.rate_per_night.amount - b.rate_per_night.amount)[0] || null;

const result = {
  status: properties.length ? 'ok' : 'no_results',
  provider: 'SerpApi',
  source: 'Google Hotels',
  generated_at: generatedAt,
  live_mode: true,
  disclaimer: 'Rates are Google Hotels snapshots for one room with 2 adults. Taxes, fees, room type and final checkout price can differ. The 3-room figure is only a simple estimate for the 6-adult group and does not confirm availability of three identical rooms.',
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
    google_hotels_url: body?.search_metadata?.google_hotels_url || null
  },
  properties,
  cheapest_property_id: cheapest?.id || null,
  cheapest_shortlisted_property_id: cheapestShortlisted?.id || null
};

const newHistory = properties.map(property => ({
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

console.log(`Saved ${OUT} with ${properties.length} priced properties.`);
if (cheapest) {
  console.log(`Cheapest: ${cheapest.name} · ${cheapest.rate_per_night.amount} ${SEARCH.currency}/room/night`);
}
if (cheapestShortlisted) {
  console.log(`Cheapest shortlist: ${cheapestShortlisted.name} · ${cheapestShortlisted.rate_per_night.amount} ${SEARCH.currency}/room/night`);
}
