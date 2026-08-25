# UI/UX Redesign — Approved direction

Status: **Implemented on PR branch for review**

This branch contains the approved TravelLog visual direction based on the reviewed mockup. PR Preview is enabled and updates automatically on every commit.

## Implemented

### Shared visual system
- Professional light dashboard style with blue primary color
- Desktop sidebar navigation
- Sticky top utility bar
- Consistent typography, spacing, cards, filters and buttons
- Dark mode support
- Responsive mobile layout with bottom navigation
- Shared `app.css` for both public pages

### Dashboard (`index.html`)
- China Autumn 2026 hero with local Shanghai skyline artwork
- Correct trip dates: 19/10–26/10/2026
- Countdown to 19/10/2026
- Summary cards for budget, flights, destinations and remaining tasks
- Highlight itinerary timeline
- Checklist with localStorage persistence
- Budget planner with localStorage persistence
- Notes, export/import and copy actions

### Flight tracker (`flights.html`)
- Correct routes:
  - 19/10/2026: SGN → PVG/SHA
  - 26/10/2026: PEK/PKX → SGN
- Keeps direct + max 1-stop results
- Direct flights ranked first by default
- Route tabs: all / outbound / return
- Stops, airline, sorting and text-search filters
- Summary cards based on real saved data
- Price trend based on `flight-history.json`
- Target price helper
- No fabricated price-drop probability

### Assets / PWA
- `app.css` — shared UI design system
- `assets/china-hero.svg` — local hero artwork, no third-party image dependency
- `sw.js` caches the redesigned UI assets

## Review checklist
- [ ] Desktop dashboard visual quality
- [ ] Desktop flight tracker visual quality
- [ ] Mobile dashboard
- [ ] Mobile flight tracker
- [ ] Flight list readability with many results
- [ ] Direct-flight priority is clear but not visually excessive
- [ ] Dark mode
- [ ] No regression in localStorage interactions
- [ ] No regression in live flight JSON rendering

## Workflow
All redesign code remains in `feat/ui-ux-redesign` / PR #6. `main` is unchanged until explicit approval to merge.
