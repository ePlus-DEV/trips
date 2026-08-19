import fs from 'node:fs/promises';
import path from 'node:path';

const TOKEN = process.env.DUFFEL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('Missing DUFFEL_ACCESS_TOKEN. Add it as a GitHub Actions repository secret.');
  process.exit(2);
}

const API = 'https://api.duffel.com';
const OUT = path.resolve('data/flights.json');
const HISTORY = path.resolve('data/flight-history.json');

const SEARCH = {
  passengers: {
    adults: 6,
    infantAge: 1,
    label: '6 adults + 1 infant (<2)'
  },
  cabinClass: 'economy',
  maxConnections: 1,
  scenarios: [
    {
      id: 'return-25',
      label: 'Return 25 Oct · evening preferred',
      slices: [
        { origin: 'SGN', destination: 'SHA', departure_date: '2026-10-20' },
        { origin: 'BJS', destination: 'SGN', departure_date: '2026-10-25' }
      ],
      returnWindow: { afterHour: 17 }
    },
    {
      id: 'return-26',
      label: 'Return 26 Oct · morning preferred',
      slices: [
        { origin: 'SGN', destination: 'SHA', departure_date: '2026-10-20' },
        { origin: 'BJS', destination: 'SGN', departure_date: '2026-10-26' }
      ],
      returnWindow: { beforeHour: 12 }
    }
  ]
};

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Duffel-Version': 'v2',
  Authorization: `Bearer ${TOKEN}`
};

async function duffel(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = { raw: text }; }

  if (!response.ok) {
    const message = body?.errors?.map?.(e => e.message).filter(Boolean).join('; ') || body?.message || `HTTP ${response.status}`;
    throw new Error(`Duffel request failed: ${message}`);
  }
  return body;
}

function passengers() {
  return [
    ...Array.from({ length: SEARCH.passengers.adults }, () => ({ type: 'adult' })),
    { age: SEARCH.passengers.infantAge }
  ];
}

function localHour(value) {
  if (!value || value.length < 13) return null;
  const hour = Number(value.slice(11, 13));
  return Number.isFinite(hour) ? hour : null;
}

function preferredReturn(offer, scenario) {
  const returnSlice = offer?.slices?.[1];
  const depart = returnSlice?.segments?.[0]?.departing_at;
  const hour = localHour(depart);
  if (hour === null || !scenario.returnWindow) return true;
  if (scenario.returnWindow.afterHour !== undefined && hour < scenario.returnWindow.afterHour) return false;
  if (scenario.returnWindow.beforeHour !== undefined && hour >= scenario.returnWindow.beforeHour) return false;
  return true;
}

function compactSegment(segment) {
  return {
    origin: segment.origin?.iata_code || segment.origin?.city_name || segment.origin?.name,
    destination: segment.destination?.iata_code || segment.destination?.city_name || segment.destination?.name,
    departing_at: segment.departing_at,
    arriving_at: segment.arriving_at,
    duration: segment.duration,
    flight_number: segment.marketing_carrier_flight_number || null,
    marketing_carrier: segment.marketing_carrier ? {
      name: segment.marketing_carrier.name,
      iata_code: segment.marketing_carrier.iata_code
    } : null,
    operating_carrier: segment.operating_carrier ? {
      name: segment.operating_carrier.name,
      iata_code: segment.operating_carrier.iata_code
    } : null
  };
}

function compactOffer(offer) {
  return {
    id: offer.id,
    live_mode: offer.live_mode,
    expires_at: offer.expires_at,
    total_amount: offer.total_amount,
    total_currency: offer.total_currency,
    base_amount: offer.base_amount,
    tax_amount: offer.tax_amount,
    total_emissions_kg: offer.total_emissions_kg,
    owner: offer.owner ? {
      name: offer.owner.name,
      iata_code: offer.owner.iata_code,
      logo_symbol_url: offer.owner.logo_symbol_url || null
    } : null,
    slices: (offer.slices || []).map(slice => ({
      origin: slice.origin?.iata_code || slice.origin?.city_name || slice.origin?.name,
      destination: slice.destination?.iata_code || slice.destination?.city_name || slice.destination?.name,
      duration: slice.duration,
      segments: (slice.segments || []).map(compactSegment)
    }))
  };
}

async function searchScenario(scenario) {
  console.log(`Searching ${scenario.label}...`);

  const created = await duffel('/air/offer_requests?return_offers=false&supplier_timeout=20000', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        slices: scenario.slices,
        passengers: passengers(),
        cabin_class: SEARCH.cabinClass
      }
    })
  });

  const requestId = created?.data?.id;
  if (!requestId) throw new Error(`Duffel did not return an offer request id for ${scenario.id}`);
  if (created?.data?.live_mode !== true) throw new Error('Duffel token is not in live mode. Refusing to publish test prices as live prices.');

  const params = new URLSearchParams({
    offer_request_id: requestId,
    limit: '100',
    sort: 'total_amount',
    max_connections: String(SEARCH.maxConnections)
  });
  const listed = await duffel(`/air/offers?${params.toString()}`);
  const allOffers = listed?.data || [];
  const preferred = allOffers.filter(offer => preferredReturn(offer, scenario));
  const selected = (preferred.length ? preferred : allOffers).slice(0, 8).map(compactOffer);

  return {
    id: scenario.id,
    label: scenario.label,
    offer_request_id: requestId,
    slices: scenario.slices,
    preferred_window_matched: preferred.length > 0,
    offers: selected,
    offer_count_seen: allOffers.length
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
    current.price_delta = (Number(current.total_amount) - Number(old.total_amount)).toFixed(2);
  }
}

const allCheapest = scenarios
  .map(s => ({ scenario_id: s.id, label: s.label, offer: s.offers[0] }))
  .filter(x => x.offer);

const result = {
  status: 'ok',
  provider: 'Duffel',
  generated_at: generatedAt,
  live_mode: true,
  disclaimer: 'Search snapshot only. Airline offers can change or expire; refresh before booking.',
  search: {
    passengers: SEARCH.passengers,
    cabin_class: SEARCH.cabinClass,
    max_connections: SEARCH.maxConnections,
    route_label: 'SGN → Shanghai · Beijing → SGN'
  },
  scenarios,
  cheapest: allCheapest.sort((a, b) => {
    if (a.offer.total_currency !== b.offer.total_currency) return 0;
    return Number(a.offer.total_amount) - Number(b.offer.total_amount);
  })[0] || null
};

const historyRows = scenarios.flatMap(s => {
  const o = s.offers[0];
  return o ? [{
    checked_at: generatedAt,
    scenario_id: s.id,
    total_amount: o.total_amount,
    total_currency: o.total_currency,
    airline: o.owner?.name || null
  }] : [];
});
const history = [...oldHistory, ...historyRows].slice(-360);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(result, null, 2) + '\n');
await fs.writeFile(HISTORY, JSON.stringify(history, null, 2) + '\n');

console.log(`Saved ${OUT}`);
for (const s of scenarios) {
  const o = s.offers[0];
  console.log(`${s.label}: ${o ? `${o.total_amount} ${o.total_currency} · ${o.owner?.name || 'airline'}` : 'no offers'}`);
}
