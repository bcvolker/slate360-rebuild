# Deliverable Branding + Twin Submit-Flow — LOCKED (2026-06-30)

Two designs, converged across a 9+ AI panel + repo audit. Both additive, extend existing code.

## A. Deliverable branding, logo overlay & white-label

**Model (3 layers, resolve deliverable→project→org→Slate360 default, then tier-gate server-side):**
- Org branding exists (`organizations` brand settings / `BrandSettingsForm` → `/api/site-walk/branding/settings`).
- Project defaults → `projects.settings.branding` (jsonb, no migration).
- **Per-deliverable override → `deliverable_branding` table (SHIPPED, applied to prod, commit b8183fce):**
  `(deliverable_type site_walk|twin, deliverable_id)`, `logo_overlay jsonb`, accent/header/footer/contact,
  `hide_slate360_mark`. RLS org-scoped.
- **Logo overlay = normalized transform `{x,y,scale,opacity}`** (x/y = logo CENTER as fraction of canvas;
  scale = logo width fraction) so ONE JSON renders identically in web viewers + PDF. Types + math + resolver +
  `<BrandOverlay>` SHIPPED (`lib/branding/*`, `components/branding/BrandOverlay.tsx`).

**Entitlement gating (server-side resolver, `canWhiteLabel` = enterprise):** all tiers may add their own logo
overlay/text/accent on their deliverables; **only enterprise removes the Slate360 mark / fully white-labels**;
lower tiers keep "Made with Slate360" + see a locked "upgrade to white-label" chip. Resolver clamps + strips
white-label intent for non-enterprise. Never trust the client.

**Editor UX (follow-up):** shared `BrandingEditorSheet` reachable from BOTH apps (Site Walk deliverable settings +
Twin "Title & branding"). Live preview canvas + **react-rnd** draggable/resizable logo + opacity/size sliders +
corner presets + custom text lines (1–3). Mobile: sliders + corner presets (drag optional). Graphite Glass,
tokens-only, no amber, 48–72px. `pixelsToOverlay`/`overlayToPixels` (shipped) bind react-rnd ↔ normalized JSON.

**Render (follow-up wiring):** `<BrandOverlay>` mounts over the media stage in `ViewerClient` (`/view/[token]`,
`/share/deliverable`) and over the splat canvas in `TwinShareAnnotateShell` (`/share/twin/[token]`);
`ExternalPortalShell` swaps its Slate mark per `showSlate360Mark`. **PDF bake:** same normalized transform →
`pdf-lib` `drawImage` with `flipYForPdf` (helper shipped) in `lib/site-walk/pdf/*`.

**API (follow-up):** `GET/PUT /api/site-walk/deliverables/[id]/branding` + twin equiv; `GET /api/share/[token]/branding`
(public, token-gated, resolved only); logo upload → R2. Freeze resolved branding into the deliverable's
share snapshot at publish so viewers never diverge.

**Build order:** ①types+math+resolver+migration ✅ → ②`<BrandOverlay>` ✅ → ③wire into 3 viewers → ④editor sheet
(react-rnd) → ⑤PDF bake → ⑥API + snapshot-at-publish → ⑦enterprise white-label shell suppression.

## B. Twin submit-flow + viewer clarity (fewest clicks)

**Collapse 5 steps → 3 screens** (Review → Submit → Status), 2 taps to queue (was 5+):
- **Screen 1 (Review):** inline-editable scan title · quality chips (Draft/Standard/High) each showing
  **credits + time inline** · optional sources collapsed · surrounding-context. **Sticky live estimate** updates on
  EVERY change with credit-Δ + time-Δ + one-line plain-language "why". Est. infra already exists
  (`computeTwinProcessingCredits`, `useTwinProcessingEstimate`) — surface it as live deltas. Default = **Standard**
  (not draft). Rename tiers to plain language ("Quick preview / Standard ★ / High detail").
- **Surrounding context = honest:** either functional (Google 3D Tiles — allowed paid API, gate on GPS) OR a
  clearly-labeled **"Preview · coming soon" disabled** card showing the future Δ. **Never an inert toggle.** Currently
  inert (`TwinSubmitStepSources.tsx:109`).
- **Screen 3 (Done hub) — the discoverability fix:** four first-class 72px CTAs: **VIEW · EDIT (crop/clean) ·
  TITLE & BRANDING · SEND**, each with a one-line description. EDIT is no longer hidden.

**Crop/clean (non-destructive):** desktop `DesktopSplatEditor` (edit-list, immutable source) — add Back + **Undo/Redo**
+ unsaved-exit guard. Phone: simple bounding-box crop + floater slider with obvious Back+Undo; heavy tools
(section-cut/erase) shown **visible-but-locked → "Open on desktop"**. OSS: SuperSplat (desktop heavy), Spark (viewer).

**Viewer discoverability:** add an always-visible "Edit / Clean up" CTA in the twin viewer header (visible-but-locked
on phone). Add per-model **upright/fit** controls (the manual-orientation chip already spawned) — the hardcoded
`rotation={[Math.PI,0,0]}` in `splat-viewer-scene.tsx` is the base convention; per-capture gravity is the group
quaternion (worker Phase 0 = permanent cure).

**Build order:** ①live estimate deltas + rename tiers + default Standard → ②collapse optional/context (honest card)
→ ③Done hub 4 CTAs + viewer Edit CTA → ④phone crop + desktop undo/exit-guard → ⑤merge duplicate submit UIs.

## Open HIGH gaps found this session (real-user agent)
- **Twin share links default view-only** → recipients can't comment unless owner picks "Annotate"
  (`TwinShareActions.tsx:22`). Consider defaulting to comment-enabled, or make the role choice prominent at send.
- Mobile Site Walk deliverable **rename only reachable inside the opened viewer**, not from Share-from-list — a user
  who taps Share from the list never sees the pencil. Add a rename affordance to the list card.
- Site Walk mobile share link → **FIXED** this session (now sends commentable `/view/[token]`, commit b8183fce).
