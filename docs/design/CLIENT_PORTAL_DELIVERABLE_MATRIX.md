# Per-client deliverable matrix (token portal)

Status: **spec.** Implementation follows the tickets at the end. This describes the contractor-pilot portal on `main` as of `9afea4fa` and the configuration model to extend. It does not add a second packaging system.

Related: `docs/ops/PILOT_PACKAGE_CHECKLIST.md` (operator steps), `docs/design/LIGHT_CLIENT_PORTAL_SCOPE.md` (light theme; packaging rules unchanged by that visual pass), `docs/ops/DIRECTED_TOUR_COPY_REVIEW.md` (client words).

## 1. Decision

Each client portal shows only the deliverables that client paid for, on one link.

- The operator checks those deliverables once per project.
- The client moves between the ones that are included.
- An unchecked deliverable is absent: no tab, no tile, no teaser, no deep link, no media URL.
- A checked deliverable that is not ready yet shows a short waiting state on its own surface. It never opens a blank player, a dark stage, or a locked “upgrade” card.
- An empty package (nothing checked) keeps today’s overview line: “Nothing is shared on this link yet.”

Pilot clients use the token portal `/portal/<token>`. One token is one packaged project share. Authenticated multi-project login (vNext, #39) is out of scope.

## 2. How a token becomes a package

Verified path:

1. Publish (`app/api/spatial-walkthrough/[id]/share/route.ts`) inserts a `spatial_share_tokens` row bound to one `walkthrough_id` and returns `shareUrl` = `/portal/<token>`. The insert does not set `deliverables`, so the share inherits the project package.
2. `app/(public)/portal/[token]/page.tsx` loads that row (`loadShareRow`) and calls `loadClientPortalLanding`.
3. The walkthrough’s `project_id` selects the single `spatial_portal_packages` row (`project_id` is unique). See `loadPortalPackage` in `lib/spatial-experience/portal-package-load.ts`.
4. `effectiveDeliverables` in `lib/spatial-experience/portal-package.ts` resolves the set. `gatePortalCapabilities` then `applyPortalCapabilities` (`lib/spatial-walkthrough/portal-gating.ts`) strip anything outside that set before render.

Consequences for the pilot:

- Every portal link is anchored on a walkthrough row, because `spatial_share_tokens.walkthrough_id` is required and `POST /api/projects/[projectId]/portal-preview` refuses to mint a preview without a ready or published walkthrough. A thermal-only or drone-only sale still uses this link. Gating removes the walkthrough player when `walkthrough` is unchecked.
- Two active tokens on the same project share one package. A token may only narrow the set (`spatial_share_tokens.deliverables`). It cannot add a deliverable the project row does not include. Publish does not expose that override; the project checklist is the operator control.
- Revoke, expiry, and view caps already fail closed (`shareDenied` → the portal unavailable state).
- `resolveShareDeliverables` caches the set for 30 seconds per walkthrough, because video range requests call it. After Save, the next portal page load is the contract the panel already states.

`org_feature_flags.spatial_directed_tour` is the enforcement switch (`loadDirectedTourEnabled`). When it is false, or the read fails, `effectiveDeliverables` returns `null` and `isPackaged` allows every id. Tabs then follow whatever data exists. The pilot turns the flag on. Until it is on, this matrix is not enforced.

When the flag is on and the project has no package row, the allowed set is empty. That is fail-closed.

## 3. Deliverable catalog

Ids are the strings stored in `spatial_portal_packages.deliverables`. Client strings are what `/portal/<token>` may render. Operator strings are the Client portal panel. “Ready” is the operator badge and the condition for a playable client surface.

| Id | Operator label | Client label | Portal surface | Ready when | Waiting when checked and not ready |
|---|---|---|---|---|---|
| `walkthrough` | Walkthrough | Walkthrough | Reality. Overview hero and one **Open walkthrough** button (`/w/<token>`). | At least one `spatial_walkthroughs` row for the project in `ready` or `published` with a `spatial_clips` row in `ready`. Same query as `loadPortalReadiness`. | “Walkthrough is being prepared.” No player. |
| `tour` | Directed Tour | Directed Tour | Its own nav tab once the C2 viewer exists. | A published directed-tour route whose client viewer can play. | “Directed Tour is being prepared.” |
| `stations` | 360 photos | 360 photos | Reality tile → `/tours/view/<viewer_slug>`. | A `project_tours` row for the project with `status = published` and a `viewer_slug`. | “360 photos are being prepared.” |
| `twin` | 3D Scan | 3D Scan | Reality tile. Mesh viewer (`viewerKind` `model`: glb / gltf / usdz) via the existing twin share page. | A non-deleted `digital_twin_spaces` row with `published_model_id` set, QA accepted, and `humanReviewAccepted === true`, and that published model resolves to `model` in `resolveTwinViewerKind` (`lib/digital-twin/viewer-format.ts`). | “3D Scan is being prepared.” |
| `splat` | Gaussian splat | Photoreal 3D | Reality tile. Same twin share page, `viewerKind` `splat` (`.spz` only). | Same QA gate as `twin`, and the published model resolves to `splat`. | “Photoreal 3D is being prepared.” |
| `aerial` | Aerial 360 | Aerial 360 | Reality tile (`reality.aerialHref`). | A published aerial 360 the portal can open. No such asset is wired today (`aerialHref` is always null). | “Aerial 360 is being prepared.” |
| `drone_video` | Drone video | Drone video | Reality tile. Flat video stage. | A project drone video marked client-ready. No portal stage exists yet. | “Drone video is being prepared.” |
| `commissioning_video` | Commissioning video | Commissioning video | Reality tile. Same flat video stage, separate from drone and from the 360 player. | A project commissioning video marked client-ready. No portal stage exists yet. | “Commissioning video is being prepared.” |
| `thermal` | Thermal | Thermal | Its own nav section. A portal-native thermal view. | A thermal result published for this project into that view. | “Thermal is being prepared.” |
| `evidence` | Documents | Documents | **Documents** nav and the overview document rail. | At least one `spatial_pin_attachments` row on a pin with visibility `client` or `public`. | No Documents tab and no empty list. If documents are the only thing sold, the overview says “Documents are being prepared.” |
| `issues` | Items | Items | **Items** nav and the overview items rail. | At least one `spatial_pins` row with visibility `client` or `public`. | No Items tab and no empty list. Questions stay inside the walkthrough, which is why today’s operator note can read “No items yet · clients can ask questions from the walkthrough” while the client still has no Items tab. |
| `plan` | (not on the checklist) | Plans | None. `gatePortalCapabilities` forces `plan: false`. `/portal/<token>/plan` always redirects home. | A real plan viewer exists. It does not. | Do not add the row until that viewer exists. The id may remain in the database from the backfill. |

`PACKAGE_DELIVERABLES` in `lib/spatial-experience/portal-package.ts` is the operator checklist today: `walkthrough`, `stations`, `twin`, `evidence`, `issues`. `tour` and `plan` are already legal in the database and in `PackageDeliverable`, and a save keeps them (`kept` in the PUT handler) because they are not in `PACKAGE_DELIVERABLES`. They do not appear as checkboxes yet.

Client copy stays inside the words already locked in `docs/ops/DIRECTED_TOUR_COPY_REVIEW.md`. The render test in `lib/spatial-walkthrough/portal-gating.test.tsx` rejects Reality, representation, resolver, twin, SlateDrop, Capture graph, and Latest capture. New client HTML uses the client labels above. “Gaussian”, “splat”, and “mesh” stay on the operator side.

### Reality tab name

One Reality nav item whenever any of `walkthrough`, `tour` (before its own tab), `stations`, `twin`, `splat`, `aerial`, `drone_video`, or `commissioning_video` is packaged. Extend `realitySectionLabel`:

- Only `drone_video` and/or `commissioning_video`: **Video**
- `twin` or `splat`, and also a 360-class id (`walkthrough`, `tour`, `stations`, `aerial`): **3D Scan & 360**
- `twin` or `splat` alone: **3D Scan**
- Otherwise: **360 / Walkthrough**

`tour` leaves this group and becomes its own **Directed Tour** tab when C2 ships. Thermal is never inside this label.

### `tour` vs `walkthrough` (change from current code)

Today `gatePortalCapabilities` turns the walkthrough capability on when the package has `walkthrough` **or** `tour`, provided a playable clip exists. A Tour-only package therefore shows **Open walkthrough**.

Target: the two ids are independent. Checking Directed Tour does not open `/w/<token>`. Until C2, a checked Tour row is Waiting on the client. Checking Walkthrough still opens `/w/<token>` when a clip is ready. `shareServesWalkthrough` (`lib/spatial-experience/portal-package-load.ts`) must follow the same split, so a Tour-only token cannot boot the walkthrough player or its media route.

## 4. Where paid-for is stored

Extend the existing row. Do not add a parallel config table.

| Surface | Role |
|---|---|
| `spatial_portal_packages.deliverables text[]` | The sold set. One row per project. Migration `supabase/migrations/20260930120000_spatial_portal_packages.sql` CHECK allows `walkthrough`, `tour`, `stations`, `twin`, `plan`, `evidence`, `issues`. |
| `spatial_portal_packages.tour_history_enabled`, `current_visit_id` | Tour visit selection. Leave them. This matrix does not overload them. |
| `spatial_share_tokens.deliverables text[]` | Optional subset. `null` inherits the project row. A non-null array is intersected and cannot widen. |
| `spatial_share_tokens.audience`, `purpose` | `audience` is stored (`client`, `consultant`, `subcontractor`, `public`). Portal pin loading still keeps `client` and `public` only. `purpose = preview` is the 30-minute operator banner. |
| `org_feature_flags.spatial_directed_tour` | Enforcement switch. Default false. |

New ids `thermal`, `drone_video`, `commissioning_video`, `splat`, and `aerial` need a **new additive migration** that widens that CHECK. Do not edit `20260930120000_spatial_portal_packages.sql`. `normalizeDeliverables` drops unknown strings today (`portal-package.test.ts` already expects `"thermal"` to be ignored), so the TypeScript `KNOWN` set and the CHECK must land together or the panel cannot save the new rows.

API, already on main:

- `GET /api/projects/[projectId]/portal-package` — author. Returns `{ enabled: false }` when the flag is off. Otherwise one row per `PACKAGE_DELIVERABLES` entry: `id`, `label` (`DELIVERABLE_LABELS`), `included`, `ready`, `note`.
- `PUT` same path — replaces the offered ids and preserves any stored id outside `PACKAGE_DELIVERABLES`.
- `POST /api/projects/[projectId]/portal-preview` — 30-minute `purpose: preview` token on the latest ready walkthrough. URL `/portal/<token>`.

Readiness lives in `loadPortalReadiness` (`lib/spatial-experience/portal-readiness.ts`). It is operator-only. The client never receives the note strings.

Adding a checkbox means adding the id in all of: the new CHECK, `KNOWN` / `PackageDeliverable`, `PACKAGE_DELIVERABLES`, `DELIVERABLE_LABELS`, and `loadPortalReadiness`. The PUT `kept` list will then treat it as operator-editable.

`twin` readiness today is “any accepted published twin,” including an `.spz`. Split it: `twin` counts a mesh model only; `splat` counts an `.spz` only. A space that published a splat must not turn the 3D Scan badge Ready.

## 5. Fail-closed rules

Resolution (`effectiveDeliverables`):

- Flag off → `null` → legacy, data-driven. Pilot does not run in this mode.
- Flag on, no package → empty set.
- Flag on, package present, share `deliverables` null → the package.
- Flag on, share `deliverables` set → intersection. Ids outside `KNOWN` are dropped.

Client render (`gatePortalCapabilities` + `applyPortalCapabilities`):

- Unchecked (or narrowed off the share): capability false, href null, list empty, hero null when it belonged to that deliverable. `portalSections` omits the nav item. Overview tiles omit it (`realityEntries` in `components/external-portal/AecPortalLanding.tsx`). The Reality page omits the row (`app/(public)/portal/[token]/reality/page.tsx`).
- A disabled section route redirects to `/portal/<token>` with no error string. Plan already does this unconditionally. History already redirects because `history` is forced false. New sections (`thermal`, and `tour` when it is a tab) do the same when the id is not in the allowed set.
- Payload stripping is part of the contract, not CSS. `applyPortalCapabilities` already nulls hero, share href, capture tree, document and item locator links, and reality hrefs. New media fields follow that function.
- Walkthrough bytes: `loadPublicWalkBoot` returns denied when `shareServesWalkthrough` is false.
- Item, comment, and Ask APIs: `resolveShareAudience` returns not-ok when the set exists and lacks `issues`.
- New drone, commissioning, aerial, thermal, and splat media routes call `resolveShareDeliverables` before signing a URL. A packaged-but-waiting id still does not receive a media URL.

Checked and not ready:

- Player deliverables (`walkthrough`, `tour`, `stations`, `twin`, `splat`, `aerial`, `drone_video`, `commissioning_video`, `thermal`) stay visible as a named waiting state. The state is one sentence from the table in §3. No poster, no play button, no dark canvas, no “coming soon” badge.
- Documents and Items do not render an empty list page. They appear as a tab only when they have rows. The overview uses the waiting sentence only when that list deliverable is sold and nothing else on the portal is ready to open.
- “Nothing shared yet” (`AecPortalLanding`, `data-testid="portal-nothing-shared"`) is the empty effective set, and the legacy deliverable-token fallback on the portal page. It is not the waiting state of a sold deliverable.

Checked and ready: the existing surface, or the new stage from §8 once that ticket has shipped. The in-viewer switcher lists every other packaged player deliverable. Ready siblings link. Waiting siblings show the sentence and do not link to a player.

Deep links and previews follow the same set. An operator preview token is a normal portal token plus the banner. It must not reveal unchecked rows.

`history` stays forced off. Visit comparison belongs to Directed Tour, which replaced the old History rail (it linked every visit at one walk).

## 6. How the client switches

Use the surfaces that already exist. Add a switcher inside them. Do not add a second navigation style.

1. **Section nav** (`PortalChrome`, `portalSections`): Overview, the Reality tab (label from §3), Documents, Items, Thermal when `thermal` is packaged, Directed Tour when C2 has shipped and `tour` is packaged. Overview is always present. A single-section portal hides the nav, which is current behavior when only Overview survives.
2. **Overview tiles** (`realityEntries`): the hero is the ready walkthrough, with one Open walkthrough button and no second Walkthrough tile. Other ready Reality deliverables are rows on that card, or a tile grid when there is no hero. Waiting player deliverables are rows with the waiting sentence and no href. Unsold ids are not rows.
3. **Reality page**: the same list, one row per packaged Reality id. This page is the index when the client opens the Reality tab. It redirects home when no Reality id is packaged.
4. **In-viewer switcher**: on the walkthrough page frame, the mesh viewer, the photoreal viewer, the flat video stage, and the aerial stage, a text list of the other packaged Reality labels. Current label is marked. Waiting labels are text, not links. This is how a client moves from drone video to thermal’s sibling views without returning to the overview first. Thermal and Directed Tour are reached from the section nav, and the switcher also links to those tabs when they are packaged, so the client is not stuck inside one player.

Empty and error pages that already exist stay: unavailable, expired, and password (`TokenStatePage`). They are properties of the token, not of a missing deliverable.

## 7. Operator setup

Unchanged location: Project → Overview → **Client portal** panel (`components/spatial-walkthrough/portal/ClientPortalPanel.tsx`). The panel renders only when the flag is on and the viewer is an author.

Flow:

1. Confirm `spatial_directed_tour` is on for the org. Otherwise the panel returns nothing and the portal is data-driven.
2. Check the rows this client bought. Leave the rest unchecked.
3. Read Ready or Waiting. Waiting on a checked row is expected. It is not a failed save.
4. Save. The PUT writes the project row. The next client load picks it up (media routes within 30 seconds).
5. **Preview as client** once any walkthrough on the project is ready or published, including when Walkthrough itself is unchecked. The preview must match the checks.
6. Studio → Publish → Copy the **Client portal link**. Send `/portal/<token>` as returned. `/w/<token>` remains a walkthrough deep link and is denied when walkthrough is not packaged.
7. Revoke on that share. The portal shows the unavailable state.

Panel copy today says waiting stays hidden. When the waiting states in §5 ship, change that sentence so the operator and the client agree: unchecked stays invisible; checked and waiting shows a one-line waiting state.

Internal pins and internal documents stay off the portal. The panel does not override pin visibility.

## 8. Standing product rules

**Thermal.** The ASU Sun Deck survey UI and the current thermal share viewer (`app/share/thermal/[token]`, `components/share/thermal/ThermalShareViewer`) stay out of the client portal. A sold thermal deliverable gets a new portal section fed by the thermal outputs, built when a client has paid for it. An existing `/share/thermal/<token>` link does not flip the portal badge to Ready and is not embedded, iframed, or restyled into the portal. Operators may still send that share outside the portal; it is a different product surface.

**3D.** The portal’s default spatial model is the mesh (`twin` → `viewerKind` `model`). Gaussian splat is the optional `splat` row, sold and checked on its own. `client-portal-load.ts` today points `reality.twinHref` at the first accepted published space and lets `/share/twin/<token>` choose splat, lidar, or mesh from `model_format`. The matrix splits that lookup: `twinHref` only for a mesh model, a new `splatHref` only for `.spz`. Lidar potree stays off the client portal.

**360 video vs flat video.** Drone video and commissioning video play on a flat stage. They do not go through the equirect walkthrough player.

**Aerial inside a tour.** An aerial 360 may later be a checkpoint source on a directed-tour route. That composition is tour-builder work. In this matrix, `aerial` is its own switchable deliverable.

**More than one splat camera.** Multiple cameras and sensors are a capture and reconstruction concern. The portal shows the one published `.spz` the operator accepted. It does not grow a sensor picker.

**Drone stills.** 360 stills from the air use `aerial`, or `stations` when they are published as a station tour. Ordinary 2D drone photos ride `evidence` (client-visible attachments) for the pilot. A separate gallery id waits until a gallery is designed.

**Site Walk punch lists.** Employees keep using the Site Walk app for punch-list walks. The portal does not become that app. A client sees a punch item only when it is a spatial pin with visibility `client` or `public` and `issues` is checked.

## 9. What already works on main

- Package table, share override columns, audience, purpose, and the org flag. Backfill gave existing shared projects every id except `tour`.
- Pure resolution and tests: `lib/spatial-experience/portal-package.ts`, `portal-package.test.ts`.
- Load, 30s cache, walkthrough media gate: `portal-package-load.ts`, `public-boot.ts`.
- Fail-closed strip and nav: `portal-gating.ts`, `portal-gating.test.tsx`. Plan and History forced off. Aerial forced off. Reality nav label from what survived.
- Operator checklist, save, Ready/Waiting, preview: `ClientPortalPanel.tsx`, `app/api/projects/[projectId]/portal-package/route.ts`, `portal-readiness.ts`, `portal-preview/route.ts`.
- Client shell: light `PortalChrome`, overview tiles, Reality list, Documents, Items. Unpublished visits are not listed. Internal fixture titles are filtered in `client-portal-load.ts`.
- Publish URL is the portal link (`StudioSharePanel`).

## 10. Gaps to implement

- CHECK and `KNOWN` do not include `thermal`, `drone_video`, `commissioning_video`, `splat`, `aerial`. The panel cannot offer them.
- `tour` is legal in the database and invisible on the panel. The walkthrough capability still treats `tour` as a synonym for `walkthrough`.
- Sold and not ready is indistinguishable from unsold on the client, because every capability is `data && packaged`. Waiting states are operator-only.
- `aerial` is hard-coded false. `reality.aerialHref` is always null.
- One twin href covers mesh and splat. The portal has no `splat` id and no mesh filter.
- No flat video stage, no portal thermal section, no in-viewer switcher.
- Preview and publish require a walkthrough row. That is acceptable for the pilot (§2). A project with no walkthrough at all cannot mint `/portal/<token>`.

## 11. Phased implementation

**Phase A — catalog and gating (no new players).** Additive CHECK migration. Extend the types, labels, readiness, panel rows (`tour`, `splat`, `aerial`, `drone_video`, `commissioning_video`, `thermal`). Split `tour` from `walkthrough` in `gatePortalCapabilities` and `shareServesWalkthrough`. Split mesh vs splat in `client-portal-load.ts` and readiness. Return packaged-but-not-ready as waiting copy; strip media URLs. Update the panel intro sentence. Extend `portal-package.test.ts` and `portal-gating.test.tsx`, including “thermal-only package contains no walkthrough chrome” and “unsold drone row is absent.”

**Phase B — switcher on current surfaces.** Reality page and overview rows list packaged ids, with waiting rows that have no href. In-viewer text switcher on the walkthrough frame and the twin share viewer when opened from the portal. Section routes for missing ids redirect home. Aerial stays Waiting until an `aerialHref` exists.

**Phase C — stages, each behind its checkbox, in sale order.** Flat video stage shared by `drone_video` and `commissioning_video`. Portal thermal section (new UI, same thermal outputs). Aerial 360 stage. C2 Directed Tour tab, at which point `tour` leaves the Reality group. Splat uses the existing splat viewer kind and stays a separate checkbox.

**Phase D — only if a sale needs it.** Project-level portal token when there is no walkthrough to anchor. Aerial checkpoints inside a directed tour. Multi-sensor splat publication. A 2D drone gallery id. Share-link narrowing in the publish dialog (the API intersection already exists).

## 12. Non-goals for the pilot

- Procore or any external PM sync.
- vNext multi-project login (#39), client accounts, or a portfolio of projects on one token. `PortalLandingData.projects` stays the single project on the token.
- Audience matrices (consultant vs subcontractor filtering). Stored `audience` is unused by the portal loader beyond today’s client/public pin filter.
- Re-skinning or embedding the ASU Sun Deck thermal UI or `ThermalShareViewer`.
- Making Gaussian splat the default 3D Scan.
- A Plans tab, a History tab, or a lidar potree client view.
- Site Walk capture, punch-list authoring, or employee tools inside `/portal/<token>`.
- Browser PDF rasterization.
- Marketing, homepage, or launcher placement for thermal or for this matrix.
- Editing `lib/entitlements.ts`, billing, Stripe, middleware, or existing migration files.

## 13. Acceptance a contractor pilot can verify

Set the org flag on. Use one real project and one `/portal/<token>` link. Preview as client, then open the copied link in a private window.

1. Check only Walkthrough and Documents. Save. The client sees Overview, the walkthrough, and Documents. They do not see 3D Scan, 360 photos, Items, Thermal, Drone video, Commissioning video, Photoreal 3D, Aerial 360, or Directed Tour. Opening the Reality tab lists the walkthrough only. Typing `/portal/<token>/items` returns to the overview with no error page.
2. Uncheck Walkthrough, check 3D Scan, upload or publish nothing. The client does not get a blank 3D page. They see “3D Scan is being prepared.” The walkthrough URL `/w/<token>` does not play.
3. Uncheck everything. Save. The client sees “Nothing is shared on this link yet.” and no section nav.
4. Check Items and add no client-visible pin. There is no Items tab and no empty items page.
5. Add a client-visible pin, leave an internal pin on the same project. Only the client pin appears.
6. Check a deliverable that has no player yet (Thermal, Drone video, Commissioning video, Aerial 360, Gaussian splat, Directed Tour). The matching waiting sentence appears. No thermal share UI, no equirect player, and no splat viewer opens for that row.
7. When 3D Scan is Ready, the model that opens is the mesh. A published `.spz` does not satisfy that checkbox. It satisfies Gaussian splat only when that row is checked and the splat is accepted.
8. With two ready Reality deliverables checked, the client can move from one to the other from the overview, the Reality page, and the in-viewer list, and never sees the unchecked third.
9. Revoke the share. The link shows the unavailable state.
10. With the org flag off (staging only), confirm the panel is gone and do not use that org for the pilot.

## 14. Engineering tickets

1. **A1. Widen the package CHECK** with a new additive migration: add `thermal`, `drone_video`, `commissioning_video`, `splat`, `aerial`. Apply via the Supabase Management API. Leave `20260930120000_spatial_portal_packages.sql` untouched.
2. **A2. Extend `PackageDeliverable`.** Update `KNOWN`, `PACKAGE_DELIVERABLES`, `DELIVERABLE_LABELS`, `normalizeDeliverables` tests (a `thermal` id must survive once it is known), and the PUT `kept` behavior so the new ids are editable.
3. **A3. Readiness.** Extend `loadPortalReadiness` for each new id. Split mesh vs `.spz`. Tour, thermal, drone, commissioning, and aerial return Waiting with the §3 reason until their stage exists.
4. **A4. Stop treating `tour` as `walkthrough`.** Update `gatePortalCapabilities` and `shareServesWalkthrough`. Add a gating test that a `tour`-only set has no walkthrough href, hero, or `/w/` boot.
5. **A5. Packaged vs ready.** Thread a waiting list through `applyPortalCapabilities` and the overview / Reality render. Unsold ids stay stripped. Documents and Items stay row-gated. Update the panel intro copy.
6. **A6. Mesh href vs splat href.** In `client-portal-load.ts`, set `twinHref` only for `viewerKind === "model"` and add `splatHref` only for `viewerKind === "splat"`, each behind its package id.
7. **B1. Reality index and overview rows** for every packaged Reality id, waiting rows without hrefs, Reality redirect when none are packaged.
8. **B2. In-viewer switcher** on the walkthrough frame and the portal-opened twin viewer. Text list. Current item marked. Waiting items inert. Links to Thermal and Directed Tour tabs when those ids are packaged.
9. **C1. Flat video stage** for `drone_video` and `commissioning_video`, with media routes that call `resolveShareDeliverables`.
10. **C2. Portal thermal section** as a new presentation over thermal outputs. No import from `components/share/thermal/**` or the ASU Sun Deck viewer.
11. **C3. Aerial 360 stage** and a real `aerialHref`. Remove the `aerial: false` hard-code only on that path.
12. **C4. Directed Tour tab** when the C2 viewer ships. Move `tour` out of `realitySectionLabel`.
13. **C5. Splat entry** wired to the existing splat viewer, still a separate checkbox from 3D Scan.
14. **D1. Project-anchored token** only if a sold package has no walkthrough to hang `spatial_share_tokens.walkthrough_id` on.

Suggested order: A1–A6 before any pilot that sells a mix beyond walkthrough / 360 photos / 3D Scan / documents / items. B1–B2 before that pilot is asked to switch among two ready views. C tickets when that deliverable is actually sold.
