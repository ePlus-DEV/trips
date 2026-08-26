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

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
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

const previous = await readJson(OUT, { accounts: [], history: [] });
const previousById = new Map((Array.isArray(previous?.accounts) ? previous.accounts : []).map(row => [row.id, row]));
const history = Array.isArray(previous?.history) ? [...previous.history] : [];
const rows = [];
const generatedAt = new Date().toISOString();

for (const item of credentials) {
  try {
    const row = await accountFor(item);
    const old = previousById.get(item.id);

    // Account API already includes all searches used earlier in the current billing cycle,
    // so the first snapshot automatically backfills "old" credit usage from this month.
    // A new cycle is detected when SerpApi advances the renewal date or usage drops.
    const renewalAdvanced = Boolean(old?.renewal_date && row.renewal_date && old.renewal_date !== row.renewal_date);
    const usageReset = Number.isFinite(Number(old?.used)) && Number.isFinite(Number(row.used)) && Number(row.used) < Number(old.used);
    const cycleReset = renewalAdvanced || usageReset;

    if (cycleReset && old?.status === 'ok') {
      history.push({
        credential_id: old.id,
        label: old.label,
        role: old.role,
        archived_at: generatedAt,
        used: old.used ?? null,
        total: old.total ?? null,
        left: old.left ?? null,
        plan_name: old.plan_name ?? null,
        renewal_date: old.renewal_date ?? null
      });
    }

    row.cycle_reset_detected = cycleReset;
    rows.push(row);
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
      cycle_reset_detected: false,
      error: String(error?.message || error || 'Account API unavailable')
    });
  }
}

const snapshot = {
  generated_at: generatedAt,
  source: 'SerpApi Account API',
  reset_policy: 'SerpApi monthly billing cycle / plan renewal',
  note: 'this_month_usage includes searches already used earlier in the current billing cycle. When SerpApi starts a new monthly cycle, current counters reset and the previous snapshot is archived in history. Account API checks do not consume search credits.',
  accounts: rows,
  history: history.slice(-48)
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(snapshot, null, 2) + '\n');

const fmt = value => value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US').format(value);
const tableRows = rows.length
  ? rows.map(row => `| ${safeText(row.label)} | ${safeText(row.role)} | ${row.status === 'ok' ? `${fmt(row.used)} / ${fmt(row.total)}` : 'Không lấy được'} | ${row.status === 'ok' ? fmt(row.left) : '—'} | ${safeText(row.renewal_date || '—')} | ${safeText(row.plan_name || '—')} |`).join('\n')
  : '| — | Chưa cấu hình credential | — | — | — | — |';

const block = `${START}\n> Cập nhật tự động: **${generatedAt}**. Số **Đã dùng** lấy trực tiếp từ \`this_month_usage\`, nên lần chạy đầu tiên cũng tính luôn credit đã sử dụng trước khi tính năng thống kê được thêm vào.\n\n| API / credential | Vai trò | Đã dùng / Tổng kỳ | Còn lại | Reset / gia hạn | Plan |\n|---|---|---:|---:|---|---|\n${tableRows}\n\n> Credit reset theo **kỳ monthly/billing cycle của SerpApi** tại ngày gia hạn, không phải bộ đếm cộng dồn của repo. Khi phát hiện kỳ mới, snapshot kỳ trước được lưu vào \`data/api-usage.json.history\`. Account API không tiêu tốn search credit.\n${END}`;

let readme = await fs.readFile(README, 'utf8');
if (!readme.includes(START) || !readme.includes(END)) {
  throw new Error('README API usage markers are missing.');
}
readme = readme.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
await fs.writeFile(README, readme);

console.log(`Saved ${OUT}`);
for (const row of rows) {
  console.log(`${row.label}: ${row.status === 'ok' ? `${fmt(row.used)} / ${fmt(row.total)} used · ${fmt(row.left)} left · reset ${row.renewal_date || 'provider cycle'}` : 'usage unavailable'}`);
}
