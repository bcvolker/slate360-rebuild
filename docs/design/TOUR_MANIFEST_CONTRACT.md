# Tour Publish-Manifest Contract (v1) — shared interchange format

Owner: tour-builder workstream. Consumer #1: Slate360 SaaS live viewer.
Consumer #2: Offline Tour Package (.zip) bundled viewer. Consumer #3: the
client deliverable-link viewer (ASU-style links; separate workstream).

Rule: ONE versioned JSON manifest describes a published tour. Every surface
renders from it. No surface invents its own format. Publishing freezes a
snapshot; a sent link never changes underneath the recipient.

## Required top level
```json
{
  "schema_version": 1,
  "tour_id": "uuid",
  "published_at": "ISO-8601",
  "title": "string",
  "purpose": "marketing | aerial | wayfinding | construction",
  "branding": { "logo_url": "", "nadir_patch_url": "", "accent": "#hex" },
  "scenes": [ ... ],
  "plans": [ ... ],
  "audio": { "background_url": "", "loop": true },
  "paths": [ ... ]
}
```

## scenes[]
```json
{
  "id": "stable-id",
  "name": "string",
  "image_url": "equirect jpg/webp (R2)",
  "preview_url": "small equirect for fast first paint",
  "initial": { "yaw_deg": 0, "pitch_deg": 0, "fov_deg": 75 },
  "gps": { "lat": 0, "lon": 0, "alt_m": 0 },        // null if none; used for
                                                     // auto plan-pin priors
  "audio_url": "per-scene clip or null",
  "hotspots": [
    { "id": "", "yaw_deg": 0, "pitch_deg": 0,
      "type": "scene-link | info | audio | url",
      "target": "scene-id | text | audio_url | href", "label": "" }
  ]
}
```

## plans[]
```json
{
  "id": "", "name": "", "image_url": "sheet raster",
  "pins": [ { "scene_id": "", "fx": 0.0, "fy": 0.0, "yaw_offset_deg": 0 } ]
}
```
`fx/fy` are sheet-image fractions. If the sheet is georeferenced, include
`"georef": { "corners_enu_or_latlon": [...] }` so pins can be derived from
scene GPS automatically.

## paths[] (guided tours / animation)
```json
{
  "id": "", "name": "", "autoplay": false,
  "keyframes": [ { "t_ms": 0, "scene_id": "", "yaw_deg": 0,
                   "pitch_deg": 0, "fov_deg": 75, "ease": "linear|smooth" } ]
}
```
Frozen at publish. Offline/link viewers replay client-side; no server.

## Rules
1. `schema_version` bumps ONLY on breaking change; additive fields are free.
2. IDs are stable across republish (diffing/timeline depends on it).
3. All asset URLs point at R2 (free egress). The offline .zip rewrites them
   to relative paths — same manifest, different base.
4. The manifest must be sufficient to render with NO database access.
5. Ship one SAMPLE (manifest + assets from a real test tour) alongside the
   implementation; consumers build against the sample, not the prose.

## Two export kinds (locked decision, 2026-07-26)
- Deliverable export (view-only): this manifest + assets (live link or
  offline .zip). Deliberately not editable.
- Project handoff (editable, later): `.s360tour` = DB rows serialized +
  asset manifest (superset of this, pre-freeze). DESIGN now (stable IDs +
  schema_version make it cheap), BUILD later; collaborator access +
  Duplicate Tour cover the near term.
