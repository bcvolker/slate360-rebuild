# Portal agent handoff — Monday Spatial

The client/project portal is owned by a parallel agent. This branch only exposes interfaces.

## Do not

- Redesign `/app`, dashboard shells, or `/portal`.
- Iframe `/portal` (`frame-ancestors 'none'`).
- Assume `spatial_project_items` or `spatial_audio_assets` exist in production.

## Walkthrough

- Public player: `/w/[token]`
- JSON: `GET /api/spatial-walkthrough/public/[token]`
- Media: `GET /api/spatial-walkthrough/public/[token]/media?clip=&kind=proxy|poster` → **same-origin Range stream** (R2 302 has no CORS)
- Boot: `GET /api/spatial-walkthrough/public/[token]/boot` → `{ walkId, title, posterUrl, brand, accessState }`
- Experience profile (wiring only): `profile: "marketing" | "construction" | "facilities" | "wayfinding"` on the share JSON
- Password: `POST /api/spatial-walkthrough/public/[token]/unlock`
- Branding: `BrandTheme` on the JSON payload (`logoUrl`, `accentColor`, `logoOpacity`, `companyName`, `showPoweredBy`)
- Pins stay on `spatial_pins` + `spatial_pin_attachments` until the items migration is applied
- Locator fields: `walkthrough_id`, `clip_id`, `t_seconds`, `yaw_deg`, `pitch_deg`

Typed brand object the portal can supply later:

```ts
type ViewerBrand = {
  logoUrl: string | null;
  logoOpacity?: number;
  accentColor: string;
  companyName?: string | null;
  showPoweredBy: boolean;
};
```

## Twin

- Preview (not productized): `/preview/twin-metric?job=<uuid>`
- Kitchen job: `79a4f0ac-32e9-4358-bda0-e1a7461510e1`
- Assets: `/preview/twin-metric/asset?job=&kind=&proxy=1` → same-origin Range stream (R2 302 has no CORS)
- Modes: Reality | Geometry persistent switch. Hybrid is **Reality + Geometry** under View.

## Share / privacy

- Hidden waypoints/pins are filtered server-side for the share policy.
- Master media is never returned (`kind=master` → 404).
