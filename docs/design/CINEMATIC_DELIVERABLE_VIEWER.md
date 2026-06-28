# Cinematic Deliverable Viewer — LOCKED design (synthesis of multi-AI panel, Jun 28 2026)

> Source: 8+ independent AI design passes. Consensus was unusually tight; this doc is
> the reconciled, buildable spec. Aesthetic = Graphite Glass (`#0B0F15` canvas, glass
> panels `bg-white/[0.04]` + `backdrop-blur`, hairline `border-white/10`, brand accent
> on interactive states ONLY — never as fills).

## North star
1. **Media is the hero; UI recedes.** One persistent info rail, everything else on-demand.
2. **Short, gentle, uniform motion.** Crossfade between stops; fade-to-black into 360.
3. **Always show "where am I / what's next."** Bottom thumbnail timeline + counter.

## Build directive (critical)
**Evolve the existing `app/view/[token]/ViewerClient.tsx`** into this. Do NOT rebuild the
old `components/external-portal/DeliverableSlideshow.tsx` (EditorBlock-based, won't render
real `ViewerItem[]`). The token viewer already has the bones: stage, thumbnail strip,
prev/next, keyboard nav, per-stop `CommentThread`, branding via `ExternalPortalShell`.

## Desktop layout (≥1024px)
- **Header 56px:** org logo left, title + `n/total` counter + actions right, accent hairline.
- **Info rail LEFT, ~320–380px** (clamp; never >32% width): stop title, notes (scroll),
  optional metadata chips, voice player + transcript, Q&A affordance. Always visible.
- **Media stage:** fills remaining width, black letterbox, `object-contain` (never crop).
  Edge prev/next arrows fade in on hover.
- **Bottom timeline 88–96px:** horizontal thumbnail scrubber, active thumb = 2px accent
  border + glow, auto-scroll active into center, click to jump. Virtualize at 50+ stops.

## Mobile layout (<1024px)
Media-first vertical stack (per our mobile-fork rule — no `h-screen`/snap on content):
media hero ~55–62vh (swipe L/R = prev/next), **info as a peek bottom-sheet** (title + 2-line
note default; expand for notes/metadata/Q&A), slim filmstrip at bottom, Q&A as a **bottom
sheet** via a floating chip. Never cover full media by default.

## Interaction model
- Nav: prev/next buttons, ←/→ keys, thumbnail click, swipe (mobile). Disabled at ends.
- **360 / video = immersive overlay IN PLACE, not a route change.** Tap "Explore 360" →
  200ms fade-to-black → fullscreen `TourPanoViewer` → Esc/✕/swipe-down restores the EXACT
  stop index + scroll. Arrow keys go to the pano, not the deck (guard `activeIsInteractive`,
  extend to "overlay open"). Video: inline `<video controls>`, autoplay off, pause on leave.
- Preserve `activeIndex` (localStorage per token — already done), info scroll resets per stop.
- Deep link `?stop=N` (future) restores position.

## Transitions (motion tokens)
| Transition | Duration | Easing |
|---|---|---|
| Slide crossfade (forward) | 280–450ms | `cubic-bezier(0.22, 1, 0.36, 1)` ease-out |
| Slide crossfade (back) | ~20% faster | ease-out |
| Info content stagger | 200–250ms (+60ms delay) | ease-out |
| Enter/exit 360 immersive | 200ms out + 200ms in | linear (fade-to-black) |
| Timeline active thumb | 150–200ms | ease-out |
| Q&A drawer / sheet | 240–300ms | ease-out open, ease-in close |
Animate only `opacity`/`transform`. Honor `prefers-reduced-motion` → near-instant opacity
swap, drop directional translate. Never autoplay/auto-advance by default (WCAG 2.2.2).

## Per-stop Q&A
- Collapsed by default (Frame.io pattern). Affordance = chip with unread/thread count.
- Opens a **right drawer (desktop)** / **bottom sheet (mobile)** — NEVER a modal over media;
  dim, don't cover. Threads scoped to `itemId` (already so). Keep intent chips
  (approve/needs_change/question/comment). Owner gets notified (extend `notifyOwner` to
  per-item `viewer_comments` — REPORT-005).

## Branding
Logo top-left (≤32px), `--deliverable-accent` from org `brand_settings` drives active thumb,
focus rings, send button, progress — not backgrounds. "Shared by {name} · Frozen {date}" trust line.

## Reference patterns stolen
Matterport guided tours (bottom scene rail, fade, break-out 360) · Frame.io (collapsed
per-asset comments, media stays visible) · Apple Photos (restrained crossfade, no Ken Burns
on evidence photos) · CompanyCam/OpenSpace (photo-first + metadata-beside-narrative, trust
cues) · WAI carousel APG (keyboard, no autoplay, `aria-live`).

## Build order (slices)
1. ✅ **Info-left + crossfade + ±1 preload + active-thumb auto-scroll** (shipped — ViewerClient).
2. Q&A → collapsed chip + right drawer / bottom sheet (move `CommentThread` out of inline rail).
3. In-place **360/video immersive overlay** + fade-to-black + keyboard guard.
4. `--deliverable-accent` brand tokens + trust line + motion tokens in Graphite Glass file.
5. Timeline virtualization at 50+ stops; deep-link `?stop=N`.
6. Then fold the same layout grammar into the desktop authoring **Preview** so author sees truth.

See [[slate360-deliverable-presentation-state]], [[slate360-preview-designs-approved]],
docs/TWIN360_CAPTURE_GAPS.md (REPORT-004).
