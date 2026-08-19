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
- No framework, database or build process required

## Files

```text
trip/
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
- 20–26 October 2026
- Day-by-day itinerary included in `index.html`

The site intentionally keeps travel data in plain HTML/JavaScript so it is easy to edit directly from GitHub without a build pipeline.

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

---

Built for personal travel planning and the journeys ahead.
