import fs from 'node:fs/promises';

const realFetch = globalThis.fetch;
const captured = new Map();

function normalize(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim();
}

function propertyKey(raw) {
  return raw?.property_token || `name:${normalize(raw?.name || '')}`;
}

function compactImages(images) {
  const seen = new Set();
  return (Array.isArray(images) ? images : [])
    .map(item => ({
      thumbnail: item?.thumbnail || null,
      original_image: item?.original_image || null
    }))
    .filter(item => item.thumbnail || item.original_image)
    .filter(item => {
      const key = item.original_image || item.thumbnail;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function compactNearby(places) {
  return (Array.isArray(places) ? places : [])
    .slice(0, 8)
    .map(place => ({
      name: place?.name || null,
      transportations: (Array.isArray(place?.transportations) ? place.transportations : [])
        .slice(0, 4)
        .map(item => ({ type: item?.type || null, duration: item?.duration || null }))
        .filter(item => item.type || item.duration)
    }))
    .filter(place => place.name);
}

function capture(raw) {
  if (!raw?.name && !raw?.property_token) return;
  const key = propertyKey(raw);
  const previous = captured.get(key) || {};
  const images = compactImages(raw?.images);
  const nearby = compactNearby(raw?.nearby_places);
  captured.set(key, {
    name: raw?.name || previous.name || null,
    property_token: raw?.property_token || previous.property_token || null,
    images: images.length ? images : (previous.images || []),
    phone: raw?.phone || previous.phone || null,
    nearby_places: nearby.length ? nearby : (previous.nearby_places || []),
    typical_price_range: raw?.typical_price_range || previous.typical_price_range || null,
    essential_info: Array.isArray(raw?.essential_info)
      ? raw.essential_info.slice(0, 12)
      : (previous.essential_info || []),
    sponsored: typeof raw?.sponsored === 'boolean' ? raw.sponsored : (previous.sponsored ?? null),
    eco_certified: typeof raw?.eco_certified === 'boolean' ? raw.eco_certified : (previous.eco_certified ?? null)
  });
}

globalThis.fetch = async (...args) => {
  const response = await realFetch(...args);
  try {
    const url = String(args[0] || '');
    if (url.includes('serpapi.com') && url.includes('engine=google_hotels')) {
      const body = await response.clone().json();
      for (const raw of [
        ...(Array.isArray(body?.properties) ? body.properties : []),
        ...(Array.isArray(body?.non_matching_properties) ? body.non_matching_properties : [])
      ]) capture(raw);
    }
  } catch (error) {
    console.warn(`Could not capture hotel detail metadata: ${error.message}`);
  }
  return response;
};

try {
  await import(`./fetch-hotels.mjs?gallery=${Date.now()}`);
} finally {
  globalThis.fetch = realFetch;
}

const file = new URL('../data/hotels.json', import.meta.url);
const data = JSON.parse(await fs.readFile(file, 'utf8'));
let galleryHotels = 0;
let galleryImages = 0;

for (const property of Array.isArray(data?.properties) ? data.properties : []) {
  const capturedItem = captured.get(property.property_token || `name:${normalize(property.name)}`);
  if (!capturedItem) continue;

  const images = capturedItem.images || [];
  if (images.length) {
    property.images = images;
    property.image_url = property.image_url || images[0]?.thumbnail || images[0]?.original_image || null;
    property.photo_count_from_discovery = images.length;
    galleryHotels += 1;
    galleryImages += images.length;
  } else {
    property.images = Array.isArray(property.images) ? property.images : [];
    property.photo_count_from_discovery = property.images.length;
  }

  property.phone = capturedItem.phone || property.phone || null;
  property.nearby_places = capturedItem.nearby_places?.length
    ? capturedItem.nearby_places
    : (Array.isArray(property.nearby_places) ? property.nearby_places : []);
  property.typical_price_range = capturedItem.typical_price_range || property.typical_price_range || null;
  property.essential_info = capturedItem.essential_info?.length
    ? capturedItem.essential_info
    : (Array.isArray(property.essential_info) ? property.essential_info : []);
  property.sponsored = capturedItem.sponsored ?? property.sponsored ?? null;
  property.eco_certified = capturedItem.eco_certified ?? property.eco_certified ?? null;
  property.detail_available = Boolean(property.property_token);
}

data.search = data.search || {};
data.search.gallery_hotel_count = galleryHotels;
data.search.gallery_image_count = galleryImages;
data.search.gallery_source = 'Google Hotels discovery response';
data.snapshot_schema = Math.max(Number(data.snapshot_schema || 0), 3);

await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
console.log(`Preserved gallery/detail metadata: ${galleryHotels} hotels · ${galleryImages} images from discovery response.`);
