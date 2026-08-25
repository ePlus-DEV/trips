import fs from 'node:fs/promises';
import path from 'node:path';

const API_KEY = process.env.SERPAPI_API_KEY;
if (!API_KEY) {
  console.error('Missing SERPAPI_API_KEY. Add it as a GitHub Actions repository secret.');
  process.exit(2);
}

const API = 'https://serpapi.com/search.json';
const OUT = path.resolve('data/flights.json');
const HISTORY = path.resolve('data/flight-history.json');
const SEARCH_MODE = 'direct-priority';
const TRIP_KEY = 'sgn-shanghai-2026-10-19__beijing-sgn-2026-10-26';

const SEARCH = {
  passengers: {
    adults: 6,
    infantsOnLap: 1,
    label: '6 adults + 1 infant (<2, on lap)'
  },
  travelClass: 1,
  cabinClass: 'economy',
  stops: 2, // SerpApi: non-stop + up to 1 stop
  maxConnections: 1,
  currency: 'VND',
  routes: [
    {
      id: 'outbound',
      label: 'Outbound · 19 Oct 2026',
      description: 'Ho Chi Minh City → Shanghai',
      departure_id: 'SGN',
      arrival_id: 'SHA,PVG',
      date: '2026-10-19'
    },
    {
      id: 'return',
      label: 'Return · 26 Oct 2026',
      description: 'Beijing → Ho Chi Minh City',
      departure_id: 'PEK,PKX',
      arrival_id: 'SGN',
      date: '2026-10-26'
    }
  ]
};

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

function baseParams(route) {
  return {
    engine: 'google_flights',
    type: 2,
    departure_id: route.departure_id,
    arrival_id: route.arrival_id,
    outbound_date: route.date,
    adults: SEARCH.passengers.adults,
    infants_on_lap: SEARCH.passengers.infantsOnLap,
    travel_class: SEARCH.travelClass,
    stops: SEARCH.stops,
    currency: SEARCH.currency,
    hl: 'en',
    gl: 'vn',
    sort_by: 2,
    show_hidden: true
  };
}

function allResults(body) {
  return [
    ...(Array.isArray(body?.best_flights) ? body.best_flights : []),
    ...(Array.isArray(body?.other_flights) ? body.other_flights : [])
  ].filter(x => Number.isFinite(Number(x?.price)));
}

function minutesToIso(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n < 0) return null;
  const hours = Math.floor(n / 60);
  const mins = Math.round(n % 60);
  return `PT${hours ? `${hours}H` : ''}${mins ? `${mins}M` : (!hours ? '0M' : '')}`;
}

function timeToIso(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (match) return `${match[1]}T${match[2].padStart(2, '0')}:${match[3]}:00`;
  return raw;
}

function compactSegment(flight) {
  const airline = flight.airline || flight.operated_by || 'Airline';
  return {
    origin: flight.departure_airport?.id || flight.departure_airport?.name || null,
    destination: flight.arrival_airport?.id || flight.arrival_airport?.name || null,
    departing_at: timeToIso(flight.departure_airport?.time),
    arriving_at: timeToIso(flight.arrival_airport?.time),
    duration: minutesToIso(flight.duration),
    flight_number: flight.flight_number || null,
    airplane: flight.airplane || null,
    travel_class: flight.travel_class || null,
    marketing_carrier: {
      name: airline,
      iata_code: String(flight.flight_number || '').replace(/\s+/g, '').match(/^([A-Z0-9]{2})/)?.[1] || null
    },
    operating_carrier: {
      name: flight.operated_by || airline,
      iata_code: null
    }
  };
}

function compactSlice(raw, route) {
  const flights = Array.isArray(raw?.flights) ? raw.flights : [];
  if (!flights.length) return null;
  return {
    origin: flights[0]?.departure_airport?.id || route.departure_id,
    destination: flights.at(-1)?.arrival_airport?.id || route.arrival_id,
    duration: minutesToIso(raw.total_duration || flights.reduce((sum, f) => sum + (Number(f.duration) || 0), 0)),
    segments: flights.map(compactSegment)
  };
}

function ownerFor(raw) {
  const flights = Array.isArray(raw?.flights) ? raw.flights : [];
  const names = [...new Set(flights.map(f => f.airline || f.operated_by).filter(Boolean))];
  const firstFlight = flights[0];
  return {
    name: names.length === 1 ? names[0] : names.length > 1 ? 'Mixed airlines' : 'Airline',
    iata_code: String(firstFlight?.flight_number || '').replace(/\s+/g, '').match(/^([A-Z0-9]{2})/)?.[1] || null,
    logo_symbol_url: raw?.airline_logo || firstFlight?.airline_logo || null
  };
}

function compactOffer(raw, route, body, index) {
  const slice = compactSlice(raw, route);
  if (!slice) return null;
  const stops = Math.max(0, slice.segments.length - 1);
  return {
    id: raw.booking_token || raw.departure_token || `${route.id}-${index}-${raw.price}`,
    source: 'Google Flights via SerpApi',
    live_mode: true,
    search_mode: SEARCH_MODE,
    route_id: route.id,
    is_direct: stops === 0,
    stops,
    total_amount: String(raw.price),
    total_currency: SEARCH.currency,
    total_duration_minutes: Number(raw.total_duration) || 0,
    booking_token: raw.booking_token || null,
    departure_token: raw.departure_token || null,
    google_flights_url: body?.search_metadata?.google_flights_url || null,
    owner: ownerFor(raw),
    slices: [slice]
  };
}

function dedupeOffers(items) {
  const seen = new Set();
  return items.filter(offer => {
    const key = [
      offer.total_amount,
      ...offer.slices.flatMap(slice => slice.segments.map(seg => `${seg.flight_number || ''}:${seg.departing_at || ''}`))
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function directFirst(a, b) {
  if (a.is_direct !== b.is_direct) return a.is_direct ? -1 : 1;
  return Number(a.total_amount) - Number(b.total_amount);
}

async function searchRoute(route) {
  console.log(`Searching ${route.label}: ${route.description}...`);
  const body = await serpapi(baseParams(route));
  const offers = dedupeOffers(
    allResults(body)
      .map((raw, index) => compactOffer(raw, route, body, index))
      .filter(Boolean)
      .filter(o => o.stops <= SEARCH.maxConnections)
      .sort(directFirst)
  ).slice(0, 24);

  return {
    id: route.id,
    label: route.label,
    description: route.description,
    departure_id: route.departure_id,
    arrival_id: route.arrival_id,
    departure_date: route.date,
    search_id: body?.search_metadata?.id || null,
    google_flights_url: body?.search_metadata?.google_flights_url || null,
    offers,
    offer_count_seen: offers.length,
    direct_count: offers.filter(o => o.is_direct).length,
    one_stop_count: offers.filter(o => o.stops === 1).length,
    price_insights: body?.price_insights || null
  };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

const previous = await readJson(OUT, null);
const oldHistory = await readJson(HISTORY, []);
const generatedAt = new Date().toISOString();
const previousMatches = previous?.search?.mode === SEARCH_MODE && previous?.search?.trip_key === TRIP_KEY;

const routes = [];
for (const route of SEARCH.routes) routes.push(await searchRoute(route));

if (previousMatches) {
  for (const route of routes) {
    const current = route.offers[0];
    const old = previous?.routes?.find?.(r => r.id === route.id)?.offers?.[0];
    if (current && old && current.total_currency === old.total_currency) {
      current.previous_total_amount = old.total_amount;
      current.price_delta = (Number(current.total_amount) - Number(old.total_amount)).toFixed(0);
    }
  }
}

const outbound = routes.find(r => r.id === 'outbound')?.offers?.[0] || null;
const returning = routes.find(r => r.id === 'return')?.offers?.[0] || null;
let cheapest = null;

if (outbound && returning && outbound.total_currency === returning.total_currency) {
  const amount = Number(outbound.total_amount) + Number(returning.total_amount);
  cheapest = {
    scenario_id: 'best-pair',
    label: 'Best direct-priority pair · 19 Oct + 26 Oct',
    offer: {
      id: `pair-${outbound.id}-${returning.id}`,
      source: 'Google Flights via SerpApi · separate one-way searches',
      live_mode: true,
      search_mode: SEARCH_MODE,
      total_amount: String(amount),
      total_currency: outbound.total_currency,
      owner: {
        name: outbound.owner?.name === returning.owner?.name ? outbound.owner?.name : 'Mixed airlines',
        iata_code: null,
        logo_symbol_url: null
      },
      is_direct: Boolean(outbound.is_direct && returning.is_direct),
      route_offer_ids: { outbound: outbound.id, return: returning.id }
    }
  };
}

const routesWithResults = routes.filter(r => r.offers.length).length;
const status = cheapest ? 'ok' : routesWithResults ? 'partial' : 'no_results';
const result = {
  status,
  provider: 'SerpApi',
  source: 'Google Flights',
  generated_at: generatedAt,
  live_mode: true,
  disclaimer: cheapest
    ? 'Each direction is searched separately on Google Flights. Non-stop options are ranked first, followed by 1-stop options. The pair total is an estimate from the two selected one-way fares and should be verified before booking.'
    : 'SerpApi completed, but one or both configured directions did not return a comparable fare.',
  search: {
    mode: SEARCH_MODE,
    trip_key: TRIP_KEY,
    passengers: SEARCH.passengers,
    cabin_class: SEARCH.cabinClass,
    stops: SEARCH.stops,
    max_connections: SEARCH.maxConnections,
    currency: SEARCH.currency,
    searches_per_refresh: SEARCH.routes.length,
    route_label: '19 Oct: SGN → Shanghai · 26 Oct: Beijing → SGN'
  },
  routes,
  cheapest
};

const historyRows = cheapest ? [{
  checked_at: generatedAt,
  scenario_id: 'best-pair',
  mode: SEARCH_MODE,
  trip_key: TRIP_KEY,
  total_amount: cheapest.offer.total_amount,
  total_currency: cheapest.offer.total_currency,
  airline: cheapest.offer.owner?.name || null,
  direct: cheapest.offer.is_direct,
  provider: 'SerpApi',
  source: 'Google Flights'
}] : [];

const history = [...(Array.isArray(oldHistory) ? oldHistory : []), ...historyRows].slice(-360);
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(result, null, 2) + '\n');
await fs.writeFile(HISTORY, JSON.stringify(history, null, 2) + '\n');

console.log(`Saved ${OUT}`);
for (const route of routes) {
  const best = route.offers[0];
  console.log(`${route.label}: ${route.direct_count} direct · ${route.one_stop_count} one-stop · ${best ? `${best.total_amount} ${best.total_currency} · ${best.owner?.name || 'airline'} · ${best.is_direct ? 'direct' : '1 stop'}` : 'no offers'}`);
}
if (cheapest) console.log(`Estimated best pair: ${cheapest.offer.total_amount} ${cheapest.offer.total_currency}`);
