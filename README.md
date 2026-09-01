# Personal Travel Log

A lightweight personal travel dashboard for GitHub Pages with itinerary, budget, notes, PWA support and automated Google Flights price tracking.

## Features

- Responsive desktop/mobile travel dashboard
- Countdown, route, itinerary and destination cards
- Checklist, budget and notes saved in `localStorage`
- Export/import local travel data
- Light/dark mode and PWA/offline support
- **Google Flights price snapshots through SerpApi + GitHub Actions**
- Fare-specific baggage details from Google Flights search and Booking Options
- Direct-flight priority, stops/airline filters, price history and price alerts
- SerpApi credit/usage snapshot written automatically to this README
- No separate backend server

## Current China trip

- Ho Chi Minh City → Shanghai → Beijing
- Outbound: **19 October 2026** — SGN → SHA/PVG
- Return: **26 October 2026** — PEK/PKX → SGN
- **6 adults + 1 infant under 2 on lap**
- Economy
- Direct flights are prioritized; maximum 1 stop remains available

## Live flight prices

The workflow `.github/workflows/update-flight-prices.yml` calls SerpApi's Google Flights engine. API keys remain in GitHub Actions Secrets and are never exposed in the browser.

The current fetcher searches each direction separately so the dashboard can keep a broader list of flight options:

1. Ho Chi Minh City → Shanghai on 19 October 2026,
2. Beijing → Ho Chi Minh City on 26 October 2026.

Each route keeps non-stop and 1-stop results, then ranks **non-stop first** by default. One successful refresh normally uses **2 Google Flights search requests**.

After the main search succeeds, an optional Booking Options enrichment step can use a **separate SerpApi credential** to fetch richer fare/baggage information for selected offers. Booking Options enrichment only runs when `BOOKING_OPTIONS_ENABLED=true` and a booking credential exists.

If all dedicated flight-tracking/search credentials are exhausted or fail, the workflow can use `SERPAPI_BOOKING_API_KEY` as the **last-resort Google Flights search credential**. When that fallback is used, Booking Options enrichment is skipped for that run so the same credential is not immediately consumed by extra enrichment requests.

### SerpApi usage / credits

The workflow checks SerpApi's free Account API after each refresh and updates both `data/api-usage.json` and the table below. The Account API returns `this_month_usage`, monthly allowance, remaining searches and the next plan renewal date for the account behind each configured credential.

The first usage refresh does **not** start counting from zero: `this_month_usage` already includes successful searches consumed earlier in the current SerpApi billing cycle, so credits used before this tracker was added are counted again automatically.

<!-- API_USAGE_START -->
> Cập nhật tự động: **2026-09-01T05:20:25.680Z**. Số **Đã dùng** lấy trực tiếp từ `this_month_usage`, nên lần chạy đầu tiên cũng tính luôn credit đã sử dụng trước khi tính năng thống kê được thêm vào.

| API / credential | Vai trò | Đã dùng / Tổng kỳ | Còn lại | Reset / gia hạn | Plan |
|---|---|---:|---:|---|---|
| Flight + Hotel Search #1 | Theo dõi giá vé + phòng | 72 / 250 | 178 | 2026-09-20 | Free Plan |
| Booking Options | Booking/baggage + search fallback | 0 / 250 | 250 | 2026-09-25 | Free Plan |

> Credit reset theo **kỳ monthly/billing cycle của SerpApi** tại ngày gia hạn, không phải bộ đếm cộng dồn của repo. Khi phát hiện kỳ mới, snapshot kỳ trước được lưu vào `data/api-usage.json.history`. Account API không tiêu tốn search credit.
<!-- API_USAGE_END -->

SerpApi resets monthly searches at the start of a new billing cycle. The reset date is the provider's `plan_renewal_date`, so it may not be the first calendar day of the month. The tracker detects a new cycle when the renewal date advances or the provider's current-cycle usage drops, then archives the previous counter before showing the new cycle.

### Request cost per refresh

| API | Bình thường | Tối đa theo cấu hình hiện tại | Ghi chú |
|---|---:|---:|---|
| Google Flights Search | 2 requests | 2 requests | 1 request cho mỗi chiều |
| Booking Options | 0 requests khi tắt | 8 requests khi bật mặc định | 4 offer/route × 2 routes |
| Booking credential used as search fallback | 0 | 2 requests | Chỉ dùng khi các search credential không còn dùng được; enrichment bị skip trong run đó |
| SerpApi Account API | 1 request / credential | Không tính credit | Dùng để cập nhật bảng usage |

SerpApi counts successful, non-cached searches toward monthly search credits; failed/error responses and cached responses do not consume a monthly search credit. The README usage table therefore uses SerpApi Account API totals as the source of truth rather than estimating credits only from workflow runs.

### SerpApi secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**

Main Google Flights search:

```text
Name: SERPAPI_API_KEY
Value: <your SerpApi search API key>
```

Optional backup credentials for the main search:

```text
SERPAPI_API_KEY_2
SERPAPI_API_KEY_3
```

Dedicated Booking Options credential:

```text
Name: SERPAPI_BOOKING_API_KEY
Value: <your separate SerpApi API key for Booking Options>
```

`SERPAPI_BOOKING_API_KEY` normally belongs to `scripts/enrich-booking-options.mjs`, but it can also be used as an emergency Google Flights search fallback when all dedicated search credentials are unavailable.

Do not add API keys to source code, repository variables, `flights.json`, issues or PR comments.

### Booking Options enable flag and request limit

Booking Options enrichment is **disabled by default** even when `SERPAPI_BOOKING_API_KEY` exists. Enable it explicitly with an Actions repository variable:

```text
BOOKING_OPTIONS_ENABLED=true
```

Disable it with:

```text
BOOKING_OPTIONS_ENABLED=false
```

By default, when enabled, Booking Options enriches the first **4 offers per route** after the direct-first sort, so a refresh can use up to **8 Booking Options requests** in addition to the 2 main search requests.

You can override the limit with an Actions repository variable:

```text
BOOKING_OPTIONS_LIMIT_PER_ROUTE=4
```

Valid values are capped at 24. Reducing this value saves Booking Options quota. If the dedicated key hits a quota/rate limit, enrichment stops without discarding the successful main flight-search snapshot.

### Search credential fallback order

The workflow uses this order for live flight tracking:

```text
SERPAPI_API_KEY
→ SERPAPI_API_KEY_2
→ SERPAPI_API_KEY_3
→ SERPAPI_BOOKING_API_KEY (last-resort search fallback)
```

The booking credential is only used for live search after the dedicated search credentials fail. If it is used for search fallback, the Booking Options enrichment step is skipped for that workflow run.

### Run a manual check

```text
Actions
→ Update live flight prices
→ Run workflow
```

The workflow writes:

```text
data/flights.json
data/flight-history.json
data/api-usage.json
```

and commits refreshed snapshots back to `main`.

### Automatic refresh

The default schedule is:

```text
07:17 Asia/Ho_Chi_Minh
```

At 2 main search requests per refresh, a 30-day month is roughly **60 Google Flights search requests**, plus manual checks. Booking Options can add up to **240 requests/month** at the default 8 requests/day if it is enabled every day. Actual provider usage is shown in the live SerpApi usage table above and resets when SerpApi starts the next billing cycle.

### Price dashboard

`flights.html` provides:

- separate outbound and return flight lists
- **Recommended · direct first** sorting by default
- Cheapest / Fastest / Departure-time sorting
- All / Direct only / 1 stop only filters
- airline filter
- one-way fare for the selected travellers
- expandable flight details
- fare-specific baggage details when Google Flights provides them
- estimated best outbound + return total
- price history for the current trip dates
- freshness indicator
- browser-local target price
- shortcut to run GitHub Actions manually

## UI / localization standard

Public pages use UTF-8 and the shared Vietnamese-safe system font stack:

```text
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif
```

Vietnamese is the default UI for first-time visitors. The main dashboard keeps the existing language switcher for:

- Tiếng Việt
- English
- 中文 (Simplified Chinese)
- 日本語

The selected language is stored in `localStorage` as `travel-language`.

VND values are displayed in the Vietnamese format, for example:

```text
21.840.000 đ
```

## Optional GitHub Issue price alert

Create repository Actions variables:

```text
FLIGHT_ALERT_AMOUNT=50000000
FLIGHT_ALERT_CURRENCY=VND
```

When the current estimated best pair total is at or below the threshold, the workflow opens or updates the flight-price alert issue. Final fares can still change, so always verify the itinerary and checkout amount before payment.

## Files

```text
trips/
├── .github/workflows/
│   ├── pr-preview.yml
│   └── update-flight-prices.yml
├── data/
│   ├── api-usage.json
│   ├── flights.json
│   └── flight-history.json
├── scripts/
│   ├── fetch-flights.mjs
│   ├── enrich-booking-options.mjs
│   └── update-api-usage.mjs
├── flights/
│   └── index.html
├── flights.html
├── index.html
├── i18n.js
├── site-standard.js
├── manifest.webmanifest
├── sw.js
├── icon.svg
├── CNAME
├── .nojekyll
└── README.md
```

## Local development

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/
http://localhost:8080/flights.html
```

## GitHub Pages

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

The refresh workflow explicitly requests a Pages rebuild after committing price data because a commit pushed by a workflow `GITHUB_TOKEN` does not itself trigger another Pages build.

---

Built for personal travel planning and the journeys ahead.
