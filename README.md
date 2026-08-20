# Personal Travel Log

A lightweight personal travel dashboard for GitHub Pages with itinerary, budget, notes, PWA support and automated Google Flights price tracking.

## Features

- Responsive desktop/mobile travel dashboard
- Countdown, route, itinerary and destination cards
- Checklist, budget and notes saved in `localStorage`
- Export/import local travel data
- Light/dark mode and PWA/offline support
- **Google Flights price snapshots through SerpApi + GitHub Actions**
- Return-date comparison, airline/stops filters, price history and price alerts
- No separate backend server

## Current China trip

- Ho Chi Minh City → Shanghai → Beijing
- Outbound: **20 October 2026**
- Return options: **25 October evening** or **26 October morning**
- **6 adults + 1 infant under 2 on lap**
- Economy
- Direct or maximum 1 stop per leg

## Live flight prices

The workflow `.github/workflows/update-flight-prices.yml` calls SerpApi's Google Flights engine. The API key remains in GitHub Actions Secrets and is never exposed in the browser.

Google Flights multi-city selection is sequential. For each return-date scenario the fetcher performs:

1. initial multi-city search to get the first-leg options and a `departure_token`,
2. a second search with that token to get the next leg and complete itinerary prices.

There are two scenarios, so one refresh uses **4 SerpApi searches**.

### 1. Create a SerpApi key

Create a SerpApi account and copy your private API key.

### 2. Add the GitHub Actions secret

Repository → **Settings → Secrets and variables → Actions → New repository secret**

```text
Name: SERPAPI_API_KEY
Value: <your SerpApi API key>
```

Do not add the key to source code, repository variables, `flights.json`, issues or PR comments.

### 3. Merge the PR and run the first check

After the workflow exists on `main`:

```text
Actions
→ Update live flight prices
→ Run workflow
```

The workflow writes:

```text
data/flights.json
data/flight-history.json
```

and commits refreshed snapshots back to `main`.

### Automatic refresh

The default schedule is:

```text
07:17 Asia/Ho_Chi_Minh
```

One refresh uses 4 API searches, so a 30-day month is roughly **120 searches**, leaving room for manual checks within SerpApi's free quota.

### Price dashboard

`flights.html` provides:

- comparison of returning **25 vs 26 October**
- Cheapest / Fastest sorting
- Direct only / 1 stop filters
- airline filter
- total search price for the selected 7 travellers
- rough total ÷ 7 reference value
- price change from the previous check
- lowest/highest saved prices
- saved trend chart
- Fresh / Aging / Stale indicator
- browser-local target price
- shortcut to run GitHub Actions manually

## Optional GitHub Issue price alert

Create repository Actions variables:

```text
FLIGHT_ALERT_AMOUNT=30000000
FLIGHT_ALERT_CURRENCY=VND
```

When the current cheapest total is at or below the threshold, the workflow opens or updates:

```text
✈️ Flight price alert · China 2026
```

When the price moves above the target again, the issue is closed.

## Price notes

The results are Google Flights search snapshots, not locked fares. Google Flights may omit some carriers/options and final seller prices can change. Baggage, card and other optional fees may be additional. Always verify the itinerary and final amount on Google Flights or the airline/agency before paying.

## Files

```text
trips/
├── .github/workflows/
│   ├── pr-preview.yml
│   └── update-flight-prices.yml
├── data/
│   ├── flights.json
│   └── flight-history.json
├── scripts/
│   └── fetch-flights.mjs
├── flights/
│   └── index.html
├── flights.html
├── index.html
├── manifest.webmanifest
├── sw.js
├── icon.svg
├── CNAME
├── .nojekyll
└── README.md
```

## Navigation & languages

The main dashboard links directly to the flight price watcher from the desktop navigation, hero actions, Flights essentials card and mobile navigation.

The dashboard and flight-price page share `i18n.js` with these languages:

- English
- Tiếng Việt
- 中文 (Simplified Chinese)
- 日本語

The selected language is stored in `localStorage` as `travel-language`; otherwise the browser language is detected automatically.

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
