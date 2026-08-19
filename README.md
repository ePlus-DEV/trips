# Personal Travel Log

A lightweight personal travel dashboard built for GitHub Pages. It works as a static site, stores personal planning data locally in the browser, and can also behave like a small installable web app.

## Features

- Responsive desktop and mobile layout
- Live countdown to the next departure
- Visual trip route and overview statistics
- Trip essentials: flights, hotels, internet and map shortcuts
- Expandable day-by-day itinerary
- Upcoming destination cards
- Pre-trip checklist with completion percentage
- Budget tracker with planned / actual / remaining totals
- Personal trip notes saved automatically in `localStorage`
- Export / import local travel data as JSON
- Native share button when supported
- Light / dark mode
- Mobile bottom navigation
- PWA manifest + service worker for install/offline use
- **Live airline price snapshots from Duffel via GitHub Actions**
- Price history stored in the repository for later comparison
- No backend server required

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
├── flights.html
├── index.html
├── manifest.webmanifest
├── sw.js
├── icon.svg
├── .nojekyll
└── README.md
```

## Current trip

The starter data is configured for the China trip in October 2026:

- Ho Chi Minh City → Shanghai → Beijing
- Outbound: 20 October 2026
- Return scenarios: evening 25 October or morning 26 October 2026
- **6 adults + 1 infant under 2 years old**
- Economy
- Maximum 1 connection per slice

## Live flight prices

Flight prices are fetched by `.github/workflows/update-flight-prices.yml` using the Duffel **live** API. The Duffel access token is never stored in the repository or sent to the browser.

### 1. Create a Duffel live access token

Use the Duffel dashboard to create a live-mode access token.

### 2. Add the GitHub Actions secret

Repository → **Settings → Secrets and variables → Actions → New repository secret**

```text
Name: DUFFEL_ACCESS_TOKEN
Value: duffel_live_...
```

Do not add this token to source code, `flights.json`, or any public GitHub variable.

### 3. Run the first live search

Repository → **Actions → Update live flight prices → Run workflow**

The workflow:

1. searches Duffel for two return-date scenarios,
2. rejects test-mode responses,
3. keeps the cheapest results with at most one connection,
4. stores the current snapshot in `data/flights.json`,
5. appends the cheapest results to `data/flight-history.json`,
6. commits the changed data back to the current branch,
7. explicitly requests a GitHub Pages rebuild when running on `main`.

### Automatic refresh

The workflow runs at approximately:

```text
07:17 Asia/Ho_Chi_Minh
19:17 Asia/Ho_Chi_Minh
```

It can also be run manually at any time before checking or booking a fare.

### Price disclaimer

`flights.html` shows search snapshots, not locked fares. Airline offers can change or expire quickly, so refresh the workflow before making a booking decision.

Duffel may charge excess-search fees if the account exceeds its allowed search-to-book ratio. The default schedule in this project intentionally uses only two refreshes per day.

## Personal data

Checklist, budget and notes are stored in the browser using `localStorage` under:

```text
travel-log-v2
```

Use **Export data** before changing browsers/devices. The exported JSON file can later be restored with **Import data**.

## Run locally

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
http://localhost:8080/flights.html
```

Using a local server is recommended when testing the service worker and PWA behavior.

## GitHub Pages

Repository Settings → Pages:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

The `.nojekyll` file keeps GitHub Pages in simple static-site mode.

The flight refresh workflow uses the GitHub Pages REST endpoint after an automated price commit because commits pushed using the workflow's `GITHUB_TOKEN` do not trigger a Pages build by themselves.

---

Built for personal travel planning and the journeys ahead.
