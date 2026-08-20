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

const SEARCH = {
  passengers: {
    adults: 6,
    infantsOnLap: 1,
    label: '6 adults + 1 infant (<2, on lap)'
  },
  travelClass: 1,
  cabinClass: 'economy',
  stops: 2,
  maxConnections: 1,
  currency: 'VND',
  scenarios: [
    {
      id: 'return-25',
      label: 'Return 25 Oct · evening preferred',
      legs: [
        { departure_id: 'SGN', arrival_id: 'SHA,PVG', date: '2026-10-20' },
        { departure_id: 'PEK,PKX', arrival_id: 'SGN', date: '2026-10-25' }
      ],
      returnWindow: { afterHour: 17 }
    },
    {
      id: 'return-26',
      label: 'Return 26 Oct · morning preferred',
      legs: [
        { departure_id: 'SGN', arrival_id: 'SHA,PVG', date: '2026-10-20' },
        { departure_id: 'PEK,PKX', arrival_id: 'SGN', date: '2026-10-26' }
      ],
      returnWindow: { beforeHour: 12 }
    }
  ]
};

async function serpapi(params) {
  const url = new URL(API);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
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

function baseParams(scenario) {
  return {
    engine: 'google_flights',
    type: 3,
    multi_city_json: JSON.stringify(scenario.legs),
    adults: SEARCH.passengers.adults,
    infants_on_lap: SEARCH.passengers.infantsOnLap,
    travel_class: SEARCH.travelClass,
    stops: SEARCH.stops,
    currency: SEARCH.currency,
    hl: 'en',
    gl: 'vn',
    sort_by: 2
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

function localHour(value) {
  if (!value) return null;
  const match = String(value).match(/[T\s](\d{1,2}):/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? hour : null;
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

function compactLeg(raw, fallback) {
  const flights = Array.isArray(raw?.flights) ? raw.flights : [];
  if (!flights.length) return null;

  return {
    origin: flights[0]?.departure_airport?.id || fallback?.departure_id || null,
    destination: flights.at(-1)?.arrival_airport?.id || fallback?.arrival_id || null,
    duration: minutesToIso(raw.total_duration || flights.reduce((sum, f) => sum + (Number(f.duration) || 0), 0)),
    segments: flights.map(compactSegment)
  };
}

function airlineNames(raw) {
  return [...new Set((raw?.flights || []).map(f => f.airline || f.operated_by).filter(Boolean))];
}

function ownerFor(outbound, returning) {
  const names = [...new Set([...airlineNames(outbound), ...airlineNames(returning)])];
  const firstFlight = outbound?.flights?.[0] || returning?.flights?.[0];
  return {
    name: names.length === 1 ? names[0] : names.length > 1 ? 'Mixed airlines' : 'Airline',
    iata_code: String(firstFlight?.flight_number || '').replace(/\s+/g, '').match(/^([A-Z0-9]{2})/)?.[1] || null,
    logo_symbol_url: returning?.airline_logo || outbound?.airline_logo || firstFlight?.airline_logo || null
  };
}

function compactOffer(outbound, returning, scenario, body, index) {
  const outboundSlice = compactLeg(outbound, scenario.legs[0]);
  const returnSlice = compactLeg(returning, scenario.legs[1]);
  if (!outboundSlice || !returnSlice) return null;

  return {
    id: returning.booking_token || `${scenario.id}-${index}-${returning.price}`,
    source: 'Google Flights via SerpApi',
    live_mode: true,
    expires_at: null,
    total_amount: String(returning.price),
    total_currency: SEARCH.currency,
    base_amount: null,
    tax_amount: null,
    total_emissions_kg: null,
    total_duration_minutes: (Number(outbound.total_duration) || 0) + (Number(returning.total_duration) || 0),
    booking_token: returning.booking_token || null,
    google_flights_url: body?.search_metadata?.google_flights_url || null,
    owner: ownerFor(outbound, returning),
    slices: [outboundSlice, returnSlice]
  };
}

function preferredReturn(offer, scenario) {
  const hour = localHour(offer?.slices?.[1]?.segments?.[0]?.departing_at);
  if (hour === null || !scenario.returnWindow) return true;
  if (scenario.returnWindow.afterHour !== undefined && hour < scenario.returnWindow.afterHour) return false;
  if (scenario.returnWindow.beforeHour !== undefined && hour >= scenario.returnWindow.beforeHour) return false;
  return true;
}

function dedupeOffers(items) {
  const seen = new Set();
  return items.filter(offer => {
    const key = [
      offer.total_amount,
      ...offer.slices.flatMap(slice =>
        slice.segments.map(seg => `${seg.flight_number || ''}:${seg.departing_at || ''}`)
      )
    ].join('|');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchScenario(scenario) {
  console.log(`Searching ${scenario.label}...`);

  // Google Flights multi-city selection is sequential in SerpApi.
  // First request returns the first-leg choices + departure_token.
  // Second request selects that first leg and returns the next leg + total itinerary prices.
  const initial = await serpapi(baseParams(scenario));
  const outboundCandidates = allResults(initial)
    .filter(x => x.departure_token)
    .sort((a, b) => Number(a.price) - Number(b.price));

  const outbound = outboundCandidates[0];
  if (!outbound) {
    return {
      id: scenario.id,
      label: scenario.label,
      search_ids: [initial?.search_metadata?.id].filter(Boolean),
      google_flights_url: initial?.search_metadata?.google_flights_url || null,
      slices: scenario.legs.map(leg => ({ origin: leg.departure_id, destination: leg.arrival_id, departure_date: leg.date })),
      preferred_window_matched: false,
      offers: [],
      offer_count_seen: 0,
      warning: 'Google Flights returned no selectable outbound flight.'
    };
  }

  const next = await serpapi({
    ...baseParams(scenario),
    departure_token: outbound.departure_token
  });

  const selectedOutbound = Array.isArray(next.selected_flights) && next.selected_flights.length
    ? next.selected_flights[0]
    : outbound;

  const returningCandidates = allResults(next)
    .filter(x => x.booking_token || Number.isFinite(Number(x.price)))
    .sort((a, b) => Number(a.price) - Number(b.price));

  const normalized = dedupeOffers(
    returningCandidates
      .map((returning, index) => compactOffer(selectedOutbound, returning, scenario, next, index))
      .filter(Boolean)
      .sort((a, b) => Number(a.total_amount) - Number(b.total_amount))
  );

  const preferred = normalized.filter(offer => preferredReturn(offer, scenario));
  const selected = (preferred.length ? preferred : normalized).slice(0, 12);

  return {
    id: scenario.id,
    label: scenario.label,
    search_ids: [initial?.search_metadata?.id, next?.search_metadata?.id].filter(Boolean),
    google_flights_url: next?.search_metadata?.google_flights_url || initial?.search_metadata?.google_flights_url || null,
    slices: scenario.legs.map(leg => ({
      origin: leg.departure_id,
      destination: leg.arrival_id,
      departure_date: leg.date
    })),
    selected_outbound: {
      airline: selectedOutbound?.flights?.[0]?.airline || null,
      departure: selectedOutbound?.flights?.[0]?.departure_airport?.time || null,
      arrival: selectedOutbound?.flights?.at(-1)?.arrival_airport?.time || null,
      price_hint: selectedOutbound?.price ?? null
    },
    preferred_window_matched: preferred.length > 0,
    offers: selected,
    offer_count_seen: normalized.length,
    price_insights: next?.price_insights || null
  };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

const previous = await readJson(OUT, null);
const oldHistory = await readJson(HISTORY, []);
const generatedAt = new Date().toISOString();

const scenarios = [];
for (const scenario of SEARCH.scenarios) {
  scenarios.push(await searchScenario(scenario));
}

for (const scenario of scenarios) {
  const current = scenario.offers[0];
  const previousScenario = previous?.scenarios?.find?.(s => s.id === scenario.id);
  const old = previousScenario?.offers?.[0];

  if (current && old && current.total_currency === old.total_currency) {
    current.previous_total_amount = old.total_amount;
    current.price_delta = (Number(current.total_amount) - Number(old.total_amount)).toFixed(0);
  }
}

const allCheapest = scenarios
  .map(s => ({ scenario_id: s.id, label: s.label, offer: s.offers[0] }))
  .filter(x => x.offer)
  .sort((a, b) => Number(a.offer.total_amount) - Number(b.offer.total_amount));

const result = {
  status: allCheapest.length ? 'ok' : 'no_results',
  provider: 'SerpApi',
  source: 'Google Flights',
  generated_at: generatedAt,
  live_mode: true,
  disclaimer: allCheapest.length
    ? 'Google Flights multi-city search snapshot for the selected 7 travellers. Fares can change and baggage/payment fees may apply.'
    : 'SerpApi completed successfully but Google Flights returned no comparable itinerary for the configured routes.',
  search: {
    passengers: SEARCH.passengers,
    cabin_class: SEARCH.cabinClass,
    max_connections: SEARCH.maxConnections,
    currency: SEARCH.currency,
    searches_per_refresh: SEARCH.scenarios.length * 2,
    route_label: 'SGN → Shanghai · Beijing → SGN'
  },
  scenarios,
  cheapest: allCheapest[0] || null
};

const historyRows = scenarios.flatMap(s => {
  const o = s.offers[0];
  return o ? [{
    checked_at: generatedAt,
    scenario_id: s.id,
    total_amount: o.total_amount,
    total_currency: o.total_currency,
    airline: o.owner?.name || null,
    provider: 'SerpApi',
    source: 'Google Flights'
  }] : [];
});

const history = [...(Array.isArray(oldHistory) ? oldHistory : []), ...historyRows].slice(-360);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(result, null, 2) + '\n');
await fs.writeFile(HISTORY, JSON.stringify(history, null, 2) + '\n');

console.log(`Saved ${OUT}`);
for (const s of scenarios) {
  const o = s.offers[0];
  console.log(`${s.label}: ${o ? `${o.total_amount} ${o.total_currency} · ${o.owner?.name || 'airline'}` : 'no offers'}`);
}
