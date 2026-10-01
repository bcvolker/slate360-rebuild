# Light client portal, L2 (theme B): content overview. Client-facing.

Real AOB205 data (placeholder project), opened with an operator preview token (the top banner is operator-only; clients never see it).

- `overview-full-{375,768,desktop}.png`: overview with content: latest capture, the other way in (360 stations), counts, items and documents. To show items and documents, AOB205's quarantined demo item was made client-visible for the capture only, then set back to internal.
- `overview-sparse-{375,768,desktop}.png`: the same portal with only a capture and one way in. It stays one compact card.
- `side-by-side-{375,768,desktop}.png`: homepage | portal overview, first screen.

Measured on every shot:
- no horizontal overflow
- no clipped text
- exactly one "Open walkthrough" and zero walkthrough tiles
- desktop full overview fits 1280×900 with no scroll
- the only dark background is the brand-green button

AOB205 was **re-baked with the standard tight mask** (rear-low sector + nadir, ~5% of the sphere) as a clip-level override, so its poster no longer shows the below-horizon blackout. The walkthrough's original mask is untouched (reversible).
