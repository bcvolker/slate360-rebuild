# Viewer ↔ portal contract

For the engineer working on Spatial Walkthrough rendering / the Twin viewer.
This branch does not touch `components/spatial-walkthrough/viewer/**` or any
Twin/Spark/GLB code. The only integration surface is the data below.

## Deep-link query conventions (unchanged from what already exists)

Walkthrough:
```
/w/<shareToken>?clip=<clipId>&t=<seconds>&yaw=<deg>&pitch=<deg>
```
This is the existing `spatial_share_tokens` share URL shape
(`app/w/[token]/page.tsx`), already consumed by `WalkthroughShareClient`. The
portal's item locators (`spatial_project_item_locators`: `walkthrough_id`,
`clip_id`, `t_seconds`, `yaw_deg`, `pitch_deg`) are built to round-trip into
exactly this query shape — see `PortalItemSummary.locatorHref` in
`lib/spatial-walkthrough/portal-data.ts`.

Twin (proposed, not yet consumed by any viewer route — the space/model ids
below are what the portal has available; the exact query param names are the
Twin engineer's call):
```
/digital-twins?space=<spaceId>&model=<modelId>&x=&y=&z=&qx=&qy=&qz=&qw=&mode=
```
The portal currently only links to `/digital-twins?space=<spaceId>` (no pose)
— it does not know the Twin viewer's camera/mode query contract, so it does
not attempt to construct one. Extending `PortalData.twin` with a locator is a
follow-up once that contract is confirmed.

## `ProjectViewerContext` (what the portal can hand a viewer)

```ts
type ProjectViewerContext = {
  projectId: string;
  projectName: string;
  epoch: string;              // yyyy-mm-dd, from PortalData.epochs[i].date
  brand: BrandTheme;          // see below — never raw Supabase rows
  permissions: {
    canComment: boolean;
    canCreateItems: boolean;
    canSeeDocuments: boolean;
    canMeasure: boolean;
    allowDownload: boolean;
  };
};
```
Source: `GET /api/portal/[token]` response `permissions` object plus
`project`/`brand` fields. A viewer embedded in the portal reads this from the
already-fetched portal payload — it does not need its own token exchange.

## `BrandTheme` (viewer-facing, normalized)

```ts
type BrandTheme = {
  logoUrl: string | null;
  primaryColor: string;    // hex or css var(...) — never raw org row shape
  secondaryColor: string;
  accentColor: string;
  pageBgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  logoTreatment: "light" | "dark" | "auto";
  showPoweredBy: boolean;
};
```
This is `lib/spatial-walkthrough/theme.ts`'s existing `resolveBrandTheme()`
output — unchanged by this branch. It already layers `org` → `walkthrough` →
`snapshot` theme and hides "Powered by Slate360" only when the org's
entitlement allows it. The portal calls it with `{ org: <spatial_org_themes row> }`;
nothing new for the viewer to learn if it already consumes this type on the
share-player side.

**Logo requirement** (unchanged spec, restated for the viewer engineer): top-left,
~55–70% opacity default, must not obstruct the scene, scales down on mobile.
This branch's client portal applies it in the page header, not inside any 3D
canvas — if a future embedded viewer wants the logo drawn over the canvas
itself, that's new work on the viewer side, not something this branch adds.

## What the portal expects back from a viewer route (none required for Monday)

Nothing. The portal links to `<walkthrough share URL>` and
`/digital-twins?space=<id>` as plain navigations — it does not embed either
viewer inline, and does not require any postMessage or iframe contract yet.
`allow_embed` exists on `spatial_project_shares` as a reserved column for a
future inline-embed SDK; it is not read by any code in this branch.

## `spatial_project_item_locators` (already in prod-track schema, ported here)

```sql
walkthrough_id uuid,   -- null if the item isn't pinned to a walk
clip_id uuid,
chapter_id uuid,       -- optional, from spatial_chapters
t_seconds double precision,
yaw_deg double precision,
pitch_deg double precision,
plan_locator jsonb,    -- reserved for a plan-sheet (x,y) locator, unused by this branch
xyz jsonb              -- reserved for a Twin (x,y,z) locator, unused by this branch
```
`xyz` is the seam for a future Twin-space locator ("Ask about this" inside the
3D viewer, not just the 360 player). This branch never writes to it — items
created from the portal only populate the walk/clip/t/yaw/pitch fields.
