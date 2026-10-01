# Monday mobile — Brian’s iPhone checklist

Desktop emulated mobile is **not** enough. If a remote device farm is not attached to this session, run this on the physical iPhone.

Use the `feature/monday-commercial-proof-v1` preview once it is live (replace host after deploy):

- Portal: `/portal/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269`
- Walkthrough: `/w/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269`
- Documents: `/portal/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269/documents`
- One issue: `/portal/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269/item/520c6060-0a60-4b91-9cc1-033784baa77f`
- Twin (auth required): `/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`

Physical iPhone Safari only. Emulated 390×844 is not a device PASS.

Hard refresh once after a new preview deploy. Public `/w` and `/preview` no longer register the app service worker.

## Walkthrough

- [ ] Link opens (not “Something went wrong”)
- [ ] Poster visible in under ~3s on LTE
- [ ] Play / Enter starts 360
- [ ] Drag orbits
- [ ] Pinch changes FOV
- [ ] Pin drawer opens a document
- [ ] Rotate portrait ↔ landscape; sphere survives
- [ ] Controls do not cover most of the scene
- [ ] Touch targets feel ≥44px

## Twin

- [ ] First useful spatial image (hero thumbnail or geometry) — not a blank graphite page
- [ ] Geometry actually visible (cabinets/island, not HUD-only)
- [ ] Reality actually visible, or Geometry **stays** if Reality fails
- [ ] Geometry → Reality does not flash to black
- [ ] Station chips change the view
- [ ] One View control + one Measure control on the phone; station strip at the bottom
- [ ] Safe area above the home indicator

A graphite-only viewport is FAIL even if the network tab is 200.
