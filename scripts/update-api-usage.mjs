import fs from 'node:fs/promises';
import path from 'node:path';

const ACCOUNT_API = 'https://serpapi.com/account.json';
const OUT = path.resolve('data/api-usage.json');
const README = path.resolve('README.md');
const START = '<!-- API_USAGE_START -->';
const END = '<!-- API_USAGE_END -->';

const credentials = [
  { id: 'search_1', label: 'Flight Search #1', role: 'Theo dõi giá vé', key: process.env.SERPAPI_API_KEY },
  { id: 'search_2', label: 'Flight Search #2', role: 'Theo dõi giá vé dự phòng', key: process.env.SERPAPI_API_KEY_2 },
  { id: 'search_3', label: 'Flight Search #3', role: 'Theo dõi giá vé dự phòng', key: process.env.SERPAPI_API_KEY_3 },
  { id: 'booking', label: 'Booking Options', role: 'Booking/baggage + search fallback', key: process.env.SERPAPI_BOOKING_API_KEY }
].filter(item => item.key);

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeText(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
}

async function accountFor(item) {
  const url = new URL(ACCOUNT_API);
  url.searchParams.set('api_key', item.key);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = {}; }

  if (!response.ok || body?.error) {
    throw new Error(body?.error || `HTTP ${response.status}`);
  }

  const used = numberOrNull(body.this_month_usage);
  const monthly = numberOrNull(body.searches_per_month);
  const left = numberOrNull(body.total_searches_left ?? body.plan_searches_left);
  const inferredTotal = monthly ?? (used !== null && left !== null ? used + left : null);

  return {
    id: item.id,
    label: item.label,
    role: item.role,
    status: 'ok',
    plan_name: body.plan_name || null,
    used,
    total: inferredTotal,
    left,
    renewal_date: body.plan_renewal_date || null
  };
}

const rows = [];
for (const item of credentials) {
  try {
    rows.push(await accountFor(item));
  } catch (error) {
    rows.push({
      id: item.id,
      label: item.label,
      role: item.role,
      status: 'unavailable',
      plan_name: null,
      used: null,
      total: null,
      left: null,
      renewal_date: null,
      error: String(error?.message || error || 'Account API unavailable')
    });
  }
}

const generatedAt = new Date().toISOString();
const snapshot = {
  generated_at: generatedAt,
  source: 'SerpApi Account API',
  note: 'Usage is account-level for each configured credential. Account API checks do not consume search credits.',
  accounts: rows
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(snapshot, null, 2) + '\n');

const fmt = value => value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US').format(value);
const tableRows = rows.length
  ? rows.map(row => `| ${safeText(row.label)} | ${safeText(row.role)} | ${row.status === 'ok' ? `${fmt(row.used)} / ${fmt(row.total)}` : 'Không lấy được'} | ${row.status === 'ok' ? fmt(row.left) : '—'} | ${safeText(row.plan_name || '—')} |`).join('\n')
  : '| — | Chưa cấu hình credential | — | — | — |';

const block = `${START}\n> Cập nhật tự động: **${generatedAt}**. Số liệu lấy từ SerpApi Account API và là usage của account gắn với từng credential.\n\n| API / credential | Vai trò | Đã dùng / Tổng tháng | Còn lại | Plan |\n|---|---|---:|---:|---|\n${tableRows}\n\n> Account API không tiêu tốn search credit. Nếu một credential còn được dùng ở project khác, số liệu trên bao gồm cả usage đó.\n${END}`;

let readme = await fs.readFile(README, 'utf8');
if (!readme.includes(START) || !readme.includes(END)) {
  throw new Error('README API usage markers are missing.');
}
readme = readme.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
await fs.writeFile(README, readme);

console.log(`Saved ${OUT}`);
for (const row of rows) {
  console.log(`${row.label}: ${row.status === 'ok' ? `${fmt(row.used)} / ${fmt(row.total)} used · ${fmt(row.left)} left` : 'usage unavailable'}`);
}
