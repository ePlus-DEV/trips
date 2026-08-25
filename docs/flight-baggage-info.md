# Flight baggage information

## Problem

The current flight pipeline compacts Google Flights / SerpApi results but discards fare-level `extensions`, so baggage information never reaches `data/flights.json` or the UI.

## Phase 1 — no extra API calls

Persist baggage-related strings already present in each Google Flights result `extensions` array and show them in the expanded flight details. Examples may include checked baggage fees or bag/fare conditions.

If the search response does not include baggage data, show `Chưa có thông tin hành lý cho mức giá này` rather than guessing a generic airline allowance.

## Phase 2 — optional richer booking baggage

SerpApi Booking Options can return `baggage_prices` such as free carry-on / checked-bag fees when queried with the selected offer's `booking_token`. This requires extra SerpApi requests and should be added separately if richer fare-specific baggage data is needed.

## UX rules

- Never infer 7 kg / 20 kg from airline policy alone because baggage depends on fare bundle and seller.
- Distinguish carry-on and checked baggage only when the returned data makes that distinction.
- Keep the source visible as Google Flights / fare-specific information.
