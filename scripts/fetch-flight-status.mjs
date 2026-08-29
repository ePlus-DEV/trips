import fs from 'node:fs/promises';
import path from 'node:path';

const OUTPUT = path.resolve('data/flight-status.json');
const LIVE_WINDOW_DAYS = Number(process.env.FLIGHT_STATUS_LIVE_WINDOW_DAYS || 7);
const FORCE = /^(1|true|yes|on)$/i.test(process.env.FORCE_FLIGHT_STATUS || '');

const KEYS = [
  process.env.SERPAPI_API_KEY,
  process.env.SERPAPI_API_KEY_2,
  process.env.SERPAPI_API_KEY_3,
  process.env.SERPAPI_BOOKING_API_KEY
].filter(Boolean);

const configs = [
  {
    id: 'VJ3900-2026-10-19',
    flightNumber: 'VJ3900',
    date: '2026-10-19',
    origin: 'SGN',
    destination: 'PVG'
  },
  {
    id: 'CZ3106-2026-10-26',
    flightNumber: 'CZ3106',
    date: '2026-10-26',
    origin: 'PKX',
    destination: 'CAN'
  }
];

const normalizeFlight = value => String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

function dayDiff(targetDate) {
  const today = new Date();
  const target = new Date(`${targetDate}T00:00:00Z`);
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.ceil((target.getTime() - todayUtc) / 86400000);
}

function normalizeStatus(raw, departureDelay = 0, arrivalDelay = 0) {
  const text = String(raw || '').toLowerCase();
  if (text.includes('cancel')) return ['cancelled', 'Đã hủy'];
  if (text.includes('land') || text.includes('arriv')) return ['landed', 'Đã hạ cánh'];
  if (text.includes('airborne') || text.includes('in air') || text.includes('in_air')) return ['in_air', 'Đang bay'];
  if (text.includes('depart')) return ['departed', 'Đã khởi hành'];
  if (text.includes('board')) return ['boarding', 'Đang lên máy bay'];
  if (text.includes('delay') || text.includes('late') || Number(departureDelay) > 0 || Number(arrivalDelay) > 0) return ['delayed', 'Bị trễ'];
  if (text.includes('on time') || text.includes('ontime')) return ['on_time', 'Đúng giờ'];
  if (text.includes('schedule')) return ['scheduled', 'Theo lịch'];
  return ['scheduled', 'Theo lịch'];
}

function isQuotaError(message) {
  return /429|quota|rate.?limit|monthly.?search|search(es)?.?limit|credit/i.test(String(message || ''));
}

async function serpSearch(config) {
  if (!KEYS.length) throw new Error('No SerpApi credential is configured.');
  const q = `${config.flightNumber} ${config.date} flight status`;
  let lastError;

  for (let i = 0; i < KEYS.length; i++) {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', q);
    url.searchParams.set('hl', 'en');
    url.searchParams.set('gl', 'us');
    url.searchParams.set('api_key', KEYS[i]);

    try {
      const response = await fetch(url, { headers: { 'user-agent': 'TravelLog-FlightStatus/1.0' } });
      const json = await response.json();
      if (!response.ok || json.error) {
        const message = json.error || `SerpApi HTTP ${response.status}`;
        lastError = new Error(message);
        if (isQuotaError(message)) continue;
        throw lastError;
      }
      return json;
    } catch (error) {
      lastError = error;
      if (isQuotaError(error?.message)) continue;
      throw error;
    }
  }
  throw lastError || new Error('All SerpApi credentials failed.');
}

function selectFlightResult(json, config) {
  const result = json?.flight_result;
  if (!result) return null;
  const exactDate = (result.dates || []).find(item => item?.date === config.date);
  if (!exactDate) return null;

  const metadata = exactDate.metadata || {};
  const designator = normalizeFlight(result.flight_designator || `${metadata.airline_iata_code || ''}${metadata.flight_number || ''}`);
  if (designator && designator !== normalizeFlight(config.flightNumber)) return null;
  if (metadata.origin && metadata.origin !== config.origin) return null;
  if (metadata.destination && metadata.destination !== config.destination) return null;

  return {
    rawStatus: metadata.status || exactDate.status || 'SCHEDULED_STATUS',
    departureDelay: Number(metadata.departure_delay || 0),
    arrivalDelay: Number(metadata.arrival_delay || 0),
    departure: exactDate.departure || null,
    arrival: exactDate.arrival || null,
    latestUpdate: exactDate.latest_update || result.latest_update || null,
    sources: result.sources || []
  };
}

function dateLooksExact(text, target) {
  if (!text) return false;
  const targetDate = new Date(`${target}T12:00:00Z`);
  const month = targetDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toLowerCase();
  const day = String(targetDate.getUTCDate());
  const value = String(text).toLowerCase();
  return value.includes(month) && new RegExp(`(^|\\D)0?${day}(\\D|$)`).test(value);
}

function selectAnswerBox(json, config) {
  const box = json?.answer_box;
  if (!box || box.type !== 'flight_status') return null;
  const candidates = Array.isArray(box.flights) ? box.flights : [box];
  for (const item of candidates) {
    const num = normalizeFlight(item.flight_number || item.flight_name || box.flight_number || box.title);
    if (num && !num.includes(normalizeFlight(config.flightNumber))) continue;
    const dep = item.departure || {};
    const arr = item.arrival || {};
    if (dep.airport_name && dep.airport_name !== config.origin) continue;
    if (arr.airport_name && arr.airport_name !== config.destination) continue;
    if (!dateLooksExact(dep.date || dep.time, config.date)) continue;
    return {
      rawStatus: item.flight_status || box.flight_status || 'Scheduled',
      departureDelay: 0,
      arrivalDelay: 0,
      departure: dep,
      arrival: arr,
      latestUpdate: item.latest_update || box.latest_update || null,
      sources: item.sources || box.sources || []
    };
  }
  return null;
}

function firstValue(obj, names) {
  for (const name of names) if (obj?.[name] != null && obj[name] !== '') return obj[name];
  return null;
}

function mergeAirport(base, live, delayMinutes) {
  if (!live) return { ...base, delay_minutes: Number(delayMinutes || base.delay_minutes || 0) };
  return {
    ...base,
    estimated: firstValue(live, ['estimated_time', 'estimated', 'estimated_at']) || base.estimated,
    actual: firstValue(live, ['actual_time', 'actual', 'actual_at']) || base.actual,
    terminal: firstValue(live, ['terminal']) || base.terminal,
    gate: firstValue(live, ['gate']) || base.gate,
    delay_minutes: Number(delayMinutes || 0)
  };
}

async function readCurrent() {
  try {
    return JSON.parse(await fs.readFile(OUTPUT, 'utf8'));
  } catch {
    throw new Error('data/flight-status.json is missing or invalid.');
  }
}

const data = await readCurrent();
let changed = false;
let attempted = 0;
const nowIso = new Date().toISOString();

for (const config of configs) {
  const flight = data.flights?.find(item => item.id === config.id);
  if (!flight) continue;

  const days = dayDiff(config.date);
  const withinWindow = days <= LIVE_WINDOW_DAYS && days >= -1;
  if (!FORCE && !withinWindow) continue;

  attempted++;
  console.log(`Checking ${config.flightNumber} on ${config.date}...`);
  const json = await serpSearch(config);
  const live = selectFlightResult(json, config) || selectAnswerBox(json, config);

  flight.checked_at = nowIso;
  changed = true;

  if (!live) {
    flight.status = {
      ...flight.status,
      code: 'scheduled',
      label: 'Theo lịch',
      raw: 'No exact-date operational status yet',
      live: false
    };
    flight.latest_update = 'Chưa có trạng thái vận hành đúng ngày bay từ Google.';
    flight.provider_sources = [];
    console.log(`No exact-date live status available for ${config.flightNumber}; baseline preserved.`);
    continue;
  }

  const [code, label] = normalizeStatus(live.rawStatus, live.departureDelay, live.arrivalDelay);
  flight.status = { code, label, raw: String(live.rawStatus), live: true };
  flight.departure = mergeAirport(flight.departure, live.departure, live.departureDelay);
  flight.arrival = mergeAirport(flight.arrival, live.arrival, live.arrivalDelay);
  flight.latest_update = live.latestUpdate;
  flight.provider_sources = (live.sources || []).map(source => ({
    name: source.name || 'Source',
    link: source.link || source.url || null
  })).filter(source => source.link);
  console.log(`${config.flightNumber}: ${label} (${live.rawStatus})`);
}

if (!attempted) {
  console.log(`No flight is inside the ${LIVE_WINDOW_DAYS}-day live window. Nothing to fetch.`);
  process.exit(0);
}

if (changed) {
  data.generated_at = nowIso;
  data.provider = 'SerpApi · Google Search flight status';
  data.live_mode = data.flights.some(flight => flight.status?.live);
  data.message = data.live_mode
    ? 'Operational status was checked against Google flight status data. Recheck with the airline before leaving for the airport.'
    : 'The provider does not yet expose an exact-date operational status. The booked/scheduled times remain the baseline.';
  await fs.writeFile(OUTPUT, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Updated ${OUTPUT}`);
}
