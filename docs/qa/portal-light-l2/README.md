# Light client portal, L2 (theme B): content overview. Client-facing.

Captured with an operator preview token (the top banner is operator-only; clients never see it).

Portal overview frames from this pass were removed because they displayed an internal placeholder project title. Homepage frames remain:

- `homepage-{375,768,desktop}.png`

Measured on every shot:
- no horizontal overflow
- no clipped text
- exactly one "Open walkthrough" and zero walkthrough tiles
- desktop full overview fits 1280×900 with no scroll
- the only dark background is the brand-green button

The placeholder walkthrough was re-baked with the standard tight mask (rear-low sector + nadir, ~5% of the sphere) as a clip-level override, so its poster no longer shows the below-horizon blackout. The walkthrough's original mask is untouched (reversible).
