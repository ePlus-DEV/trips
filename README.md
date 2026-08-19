# Personal Travel Log

A lightweight personal travel dashboard built as a single static page. No framework, build step, account, or database is required.

## Included

- Responsive personal travel homepage
- Live countdown to the next departure
- Upcoming destination cards
- Simple visual route
- Pre-trip checklist saved in browser `localStorage`
- Mobile-friendly layout
- Zero external dependencies

## Update the next trip

Open `index.html` and find the `nextTrip` object near the bottom:

```js
const nextTrip = {
  departure: '2026-10-20T00:00:00+07:00',
  dateLabel: '20–26 October 2026',
  name: 'China, autumn 2026',
  subtitle: 'A city-to-city journey through Shanghai and Beijing — food, streets, architecture and unhurried wandering.'
};
```

Change those values to update the main trip card and countdown.

Destination cards and route stops are plain HTML in the same file so they are easy to edit without a build process.

## Run locally

You can simply open `index.html` in a browser, or run a tiny local server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish with GitHub Pages

Because this is a static site, it can be published directly from the repository root using GitHub Pages. In repository settings, open **Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

---

Built for personal travel planning and the journeys ahead.
