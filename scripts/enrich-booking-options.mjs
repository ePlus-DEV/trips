import fs from 'node:fs/promises';
import path from 'node:path';

const API_KEY = process.env.SERPAPI_BOOKING_API_KEY;
const OUT = path.resolve('data/flights.json');
const API = 'https://serpapi.com/search.json';
const DEFAULT_LIMIT = 4;
const configuredLimit = Number.parseInt(process.env.BOOKING_OPTIONS_LIMIT_PER_ROUTE || '', 10);
const LIMIT_PER_ROUTE = Number.isFinite(configuredLimit) && configuredLimit > 0
  ? Math.min(configuredLimit, 24)
  : DEFAULT_LIMIT;

if (!API_KEY) {
  console.log('SERPAPI_BOOKING_API_KEY is not configured; skipping Booking Options enrichment.');
  process.exit(0);
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter(v => typeof v === 'string')
    .map(v => v.trim())
    .filter(Boolean))];
}

function flattenBaggagePrices(value) {
  if (!value || typeof value !== 'object') return [];
  return uniqueStrings([
    ...(Array.isArray(value.together) ? value.together : []),
    ...(Array.isArray(value.departing) ? value.departing : []),
    ...(Array.isArray(value.returning) ? value.returning : [])
  ]);
}

function compactBookingPart(part) {
  if (!part || typeof part !== 'object') return null;
  return {
    book_with: part.book_with || null,
    airline: part.airline === true,
    marketed_as: uniqueStrings(part.marketed_as),
    price: Number.isFinite(Number(part.price)) ? Number(part.price) : null,
    local_prices: Array.isArray(part.local_prices)
      ? part.local_prices
          .filter(x => x && typeof x === 'object')
          .map(x => ({
            currency: x.currency || null,
            price: Number.isFinite(Number(x.price)) ? Number(x.price) : null
          }))
          .filter(x => x.currency || x.price !== null)
      : [],
    baggage_prices: uniqueStrings(part.baggage_prices),
    option_title: part.option_title || null,
    extensions: uniqueStrings(part.extensions)
  };
}

function compactBookingOption(option) {
  if (!option || typeof option !== 'object') return null;
  const together = compactBookingPart(option.together);
  const departing = compactBookingPart(option.departing);
  const returning = compactBookingPart(option.returning);
  if (!together && !departing && !returning) return null;
  return {
    separate_tickets: option.separate_tickets === true,
    together,
    departing,
    returning
  };
}

function baggageFromBooking(body) {
  const topLevel = flattenBaggagePrices(body?.baggage_prices);
  const sellerLevel = (Array.isArray(body?.booking_options) ? body.booking_options : [])
    .flatMap(option => [option?.together, option?.departing, option?.returning])
    .flatMap(part => uniqueStrings(part?.baggage_prices));
  return uniqueStrings([...topLevel, ...sellerLevel]);
}

function isQuotaError(error) {
  return /(^|\D)429(\D|$)|quota|rate[ -]?limit|monthly\s+search|search(?:es)?\s+limit|credits?\s+(?:exhausted|limit)/i
    .test(String(error?.message || error || ''));
}

async function fetchBookingOptions(offer, currency) {
  const url = new URL(API);
  url.searchParams.set('engine', 'google_flights');
  url.searchParams.set('booking_token', offer.booking_token);
  url.searchParams.set('currency', currency || 'VND');
  url.searchParams.set('hl', 'en');
  url.searchParams.set('gl', 'vn');
  url.searchParams.set('api_key', API_KEY);

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = { raw: text }; }

  if (!response.ok || body?.error) {
    throw new Error(`Booking Options request failed: ${body?.error || `HTTP ${response.status}`}`);
  }
  if (body?.search_metadata?.status && body.search_metadata.status !== 'Success') {
    throw new Error(`Booking Options search did not complete successfully: ${body.search_metadata.status}`);
  }
  return body;
}

const data = JSON.parse(await fs.readFile(OUT, 'utf8'));
const enrichment = {
  enabled: true,
  key_source: 'SERPAPI_BOOKING_API_KEY',
  limit_per_route: LIMIT_PER_ROUTE,
  generated_at: new Date().toISOString(),
  attempted: 0,
  enriched: 0,
  with_baggage: 0,
  failed: 0,
  status: 'ok'
};

let stopForQuota = false;

for (const route of data.routes || []) {
  if (stopForQuota) break;
  const offers = (route.offers || [])
    .filter(offer => offer?.booking_token)
    .slice(0, LIMIT_PER_ROUTE);

  console.log(`Booking Options: ${route.label || route.id} · enriching ${offers.length} offer(s)`);

  for (const offer of offers) {
    if (stopForQuota) break;
    enrichment.attempted += 1;
    const label = (offer.slices || [])
      .flatMap(slice => (slice.segments || []).map(seg => seg.flight_number).filter(Boolean))
      .join(' + ') || offer.id || 'offer';

    try {
      const body = await fetchBookingOptions(offer, offer.total_currency || data.search?.currency);
      const baggageItems = baggageFromBooking(body);
      const compactOptions = (Array.isArray(body.booking_options) ? body.booking_options : [])
        .map(compactBookingOption)
        .filter(Boolean)
        .slice(0, 12);

      offer.booking_options = {
        available: compactOptions.length > 0,
        fetched_at: new Date().toISOString(),
        source: 'serpapi_google_flights_booking_options',
        baggage_prices: flattenBaggagePrices(body.baggage_prices),
        options: compactOptions
      };

      const existing = uniqueStrings(offer?.baggage?.items);
      const merged = uniqueStrings([...baggageItems, ...existing]);
      offer.baggage = {
        available: merged.length > 0,
        source: baggageItems.length
          ? 'google_flights_booking_options'
          : (offer?.baggage?.source || 'google_flights_search'),
        detail_level: baggageItems.length ? 'booking_options' : 'search_result',
        items: merged
      };

      enrichment.enriched += 1;
      if (baggageItems.length) enrichment.with_baggage += 1;
      console.log(`  ✓ ${label}: ${compactOptions.length} booking option(s), ${baggageItems.length} baggage item(s)`);
    } catch (error) {
      enrichment.failed += 1;
      console.warn(`  ✗ ${label}: ${error.message}`);
      if (isQuotaError(error)) {
        enrichment.status = 'partial_quota';
        stopForQuota = true;
        console.warn('Booking Options quota/rate limit detected; stopping enrichment without affecting the main flight search snapshot.');
      } else {
        enrichment.status = 'partial';
      }
    }
  }
}

if (!enrichment.attempted) enrichment.status = 'no_booking_tokens';
data.booking_options_enrichment = enrichment;

for (const route of data.routes || []) {
  route.booking_options_count = (route.offers || []).filter(o => o.booking_options?.available).length;
  route.baggage_info_count = (route.offers || []).filter(o => o.baggage?.available).length;
}

await fs.writeFile(OUT, JSON.stringify(data, null, 2) + '\n');
console.log(`Booking Options enrichment saved to ${OUT}`);
console.log(`Attempted ${enrichment.attempted} · enriched ${enrichment.enriched} · baggage ${enrichment.with_baggage} · failed ${enrichment.failed} · status ${enrichment.status}`);
