# Exact Google Flights deep-link fix

## Problem

Every flight offer currently receives the same route-level `search_metadata.google_flights_url`, so opening Google Flights does not preserve the specific itinerary shown in the selected card.

## Fix

Build a deterministic Google Flights `/travel/flights/booking?tfs=...` deep-link from each offer's real segments:

- origin / destination airport
- departure date
- airline IATA code
- flight number
- all physical segments for one-stop itineraries
- configured passenger mix (6 adults + 1 infant on lap)
- economy cabin
- VND / Vietnam locale

No additional SerpApi request is required, so the scheduled search remains at 2 SerpApi searches per refresh.

## Fallback

If an offer is missing segment data required to build the exact deep-link, fall back to the route-level Google Flights search URL and label the action accordingly rather than claiming it is the exact flight.
