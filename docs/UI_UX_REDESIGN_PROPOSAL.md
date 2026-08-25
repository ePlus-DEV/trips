# UI/UX Redesign Proposal

## Goal

Redesign the Travel Log so the product feels professional, calm, consistent, and task-focused on both desktop and mobile. No implementation should be merged until the direction is reviewed.

## Product principles

1. **Trip-first, not decoration-first** — the current trip, dates, route, flight status, itinerary, and actions must be visible before decorative content.
2. **One design language** — `index.html` and `flights.html` must share typography, spacing, navigation, cards, buttons, filters, colors, and responsive behavior.
3. **Vietnamese-first** — Vietnamese is the default language. Dates use `dd/mm/yyyy`; VND uses `x.xxx.xxx đ`.
4. **Direct flights are a priority, not a restriction** — keep direct + 1-stop data, show direct options first, and make the distinction obvious without visually overpowering the list.
5. **Dense enough for travel planning** — avoid oversized marketing-style hero sections and excessive whitespace. Important information should be scannable in one or two screens.
6. **Mobile is a primary use case** — common travel actions must work comfortably one-handed and without horizontal scrolling.

## Proposed visual direction

### Style

- Clean travel/product dashboard rather than a landing page.
- Neutral light background, white surfaces, subtle borders, restrained shadows.
- One primary accent color for actions; green only for success/direct states; amber for 1-stop/warnings.
- System font stack with full Vietnamese support.
- Standard font weights only: 400 / 500 / 600 / 700 / 800.
- Border radius kept moderate and consistent.

### Header

Desktop:
- Travel Log brand on the left.
- Main navigation: Tổng quan / Lịch trình / Giá vé / Kế hoạch.
- Language, theme, and context action on the right.

Mobile:
- Compact top bar.
- Bottom navigation limited to four main destinations.
- No duplicate actions between top and bottom navigation.

## Home page information architecture

### 1. Trip overview

Primary card at the top containing:
- Trung Quốc · 19–26/10/2026
- TP.HCM → Thượng Hải → Bắc Kinh → TP.HCM
- Countdown
- Number of travellers
- Flight booking status
- Hotel/checklist status

Primary actions:
- Xem giá vé
- Xem lịch trình
- Mở ghi chú

### 2. Quick status

A compact row/card group for:
- Chuyến bay
- Khách sạn
- Internet/eSIM
- Chuẩn bị

Each card should show status, not generic marketing copy.

### 3. Itinerary

Timeline grouped by date.
- Date always visible.
- City/location and main activity visible without expanding.
- Secondary details inside collapsible content.
- Avoid large decorative destination cards that duplicate timeline information.

### 4. Planner

Two-column desktop / one-column mobile:
- Checklist
- Budget
- Notes
- Useful reminders

## Flight page information architecture

### 1. Route summary

Compact route summary:
- 19/10: SGN → SHA/PVG
- 26/10: PEK/PKX → SGN
- 6 adults + 1 infant
- Economy
- Latest refresh time

Avoid a large decorative hero.

### 2. Filters

Sticky on desktop when scrolling results; compact on mobile.

Filters:
- Ưu tiên: Bay thẳng trước / Giá rẻ nhất / Nhanh nhất / Giờ khởi hành
- Điểm dừng: Tất cả / Bay thẳng / 1 điểm dừng
- Hãng bay

Secondary actions:
- Cập nhật giá
- Mở Google Flights

### 3. Flight results

Separate sections for **Chiều đi** and **Chiều về**.

Each result row/card should emphasize in this order:
1. Departure → arrival time
2. Direct / stop information
3. Airline + flight number
4. Duration
5. Total fare for selected travellers
6. Average reference per traveller
7. Verify-fare action

Direct flights:
- small green `Bay thẳng` badge
- placed first by default
- no full-row green background

1-stop flights:
- neutral card with amber stop badge and connection airport

### 4. Price history

Keep below flight results and visually secondary.
- Latest estimate
- Lowest saved
- Highest saved
- Trend chart

Do not let historical data compete with current bookable results.

## Responsive requirements

### Desktop >= 1024px
- Content width around 1120–1200px.
- Flight rows can stay horizontal.
- Filters may remain sticky.

### Tablet 700–1023px
- Two-column summaries collapse naturally.
- Flight price/action moves below route details if necessary.

### Mobile < 700px
- No horizontal scrolling.
- Minimum 44px touch targets for primary controls.
- Flight card layout becomes vertical but keeps departure/arrival times side by side.
- Filters should be one or two rows, not a long form.
- Bottom navigation remains visible.

## UX details

- Loading state uses skeletons or clear status, not blank cards.
- Empty state explains why no flight matches the selected filters.
- Refresh state should show last update and whether data is stale.
- External links clearly indicate they open Google Flights/GitHub.
- Local price target remains optional and visually secondary.
- Dark mode uses the same hierarchy, not inverted decorative colors.

## Non-goals

- No React/Vue migration for this redesign.
- No change to SerpApi search logic unless required for presenting data correctly.
- No unnecessary animation.
- No stock imagery or oversized travel illustrations.

## Implementation plan after approval

1. Agree on information architecture and visual direction in this PR.
2. Implement a shared design token/style layer on this branch.
3. Redesign `index.html` first and attach preview/screenshots for review.
4. After home page approval, apply the same system to `flights.html`.
5. Test desktop/mobile, Vietnamese text, dark mode, PWA cache, and existing JS behavior.
6. Merge only after explicit approval.

## Review checklist

- [ ] Overall visual direction approved
- [ ] Home information hierarchy approved
- [ ] Flight result layout approved
- [ ] Mobile navigation approved
- [ ] Color/typography direction approved
- [ ] Approved to begin implementation
