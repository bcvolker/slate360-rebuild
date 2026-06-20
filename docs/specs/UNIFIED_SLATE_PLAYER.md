# Spec: Unified SlatePlayer

Status: **spec / planning** (no app code). The single token-gated viewer that hosts every media
type behind one chrome + gesture grammar. Consumed by the report renderer, the twin share viewer,
and SlateDrop previews. See `RESEARCH_SYNTHESIS_AND_DECISIONS.md` §1–2.

## 1. Goal & route
One component, `<SlatePlayer>`, mounted at the canonical share route **`/view/[token]`** (and
`?embed=1` for chrome-less embeds, e.g. inside reports). It replaces the per-media share routes
over time (`/share/twin`, `/share/deliverable` media, ad-hoc pano/video). Unify at the **chrome +
gesture layer, not the renderer** (resolved decision).

## 2. Architecture

```
<SlatePlayer token playlist>
 ├─ TokenGate            // server-validated manifest → signed URLs only
 ├─ PlayerChrome (DOM)   // title, index, fullscreen, share, prev/next, recenter, mode, info
 ├─ GestureLayer (DOM)   // ONE transparent capture layer → normalized intents
 └─ MediaSlot            // mounts ONE adapter by kind; lazy-mount + dispose
      ├─ SplatAdapter   → Spark + R3F   (reads baked bounds/orientation)
      ├─ PanoAdapter    → Photo Sphere Viewer (driven imperatively)
      ├─ VideoAdapter   → <video> + hls.js
      ├─ ImageAdapter   → <img> + panzoom
      └─ GalleryAdapter → embla (image set; delegates each item to ImageAdapter)
```

At most **one live WebGL context** — dispose the previous adapter before mounting the next.

## 3. Adapter interface (the contract)

```ts
interface MediaAdapter {
  mount(el: HTMLElement, item: PlaylistItem, restore?: SlotState): Promise<void>;
  unmount(): void;                                  // dispose GL/PSV/object URLs
  resize(w: number, h: number): void;
  handleIntent(intent: MediaIntent): boolean;       // true = consumed (e.g. swipe at edge)
  reset(): void;                                     // recenter / re-frame / fit
  setActive(active: boolean): void;
  getState(): SlotState;
  setState(s: SlotState): void;
  capabilities: { rotate: boolean; zoom: boolean; modes?: ("orbit"|"walk")[]; timeline?: boolean };
}

type MediaIntent =
  | { type: "drag"; dx: number; dy: number; pointers: number; mode: "rotate"|"pan" }
  | { type: "zoom"; deltaScale: number; center: { x: number; y: number } }
  | { type: "swipe"; dir: "left"|"right" }
  | { type: "reset" }
  | { type: "setMode"; mode: "orbit"|"walk" };
```

## 4. Gesture grammar (one layer → all adapters)

| Gesture (desktop / mobile) | Intent | Splat | 360 | Image | Gallery | Video |
|---|---|---|---|---|---|---|
| drag 1-ptr | drag(rotate) | orbit / look | pan view | pan | — | — |
| right-drag / 2-finger drag | drag(pan) | pan | — | pan | — | — |
| wheel / pinch | zoom | dolly | FOV | scale | scale | — |
| horizontal flick (past threshold) | swipe | next hotspot/— | next scene | — | next item | — |
| double-tap / dblclick | reset | recenter | reset yaw/pitch | fit | — | play/pause |

Implement with **`@use-gesture/react`** on the GestureLayer (`touch-action: none` only while
interacting). Each engine's built-in input is **disabled**; cameras are driven from intents so feel
is identical across media. A small state machine (idle→drag→pinch) prevents mode flicker.

## 5. Fullscreen
`screenfull` on the **`<SlatePlayer>` root** (so chrome stays visible). **iOS fallback**: Fullscreen
API isn't available on arbitrary elements → use a fixed full-viewport portal (`position:fixed;
inset:0`) + lock body scroll. On `fullscreenchange`/`resize`, call the active adapter's `resize()`.

## 6. Per-slot state (Zustand, scoped per player)

```ts
type SlotState = {
  splat?: { mode: "orbit"|"walk"; position:[number,number,number]; target:[number,number,number]; fov:number };
  pano?:  { yaw:number; pitch:number; zoom:number };
  image?: { zoom:number; panX:number; panY:number };
  gallery?: { index:number };
  video?: { currentTime:number; paused:boolean; muted:boolean };
};
// Host store: { activeIndex, isFullscreen, isLoading, error, slotStates: Record<string,SlotState> }
```
Persist to `sessionStorage` for anonymous token viewers; server-side for authed project viewers.
Restore on slot remount so prev/next feels continuous.

## 7. Token-gated manifest (server)
`GET /api/view/[token]` → validates token (RPC, expiry, max-views) → returns a **playlist of signed,
short-lived URLs + kinds**; the client never sees raw storage keys.

```ts
type ViewManifest = {
  token: string;
  permissions: { allowDownload: boolean; allowComments: boolean };
  branding?: { logoUrl?: string; accentColor?: string };
  playlist: PlaylistItem[];
};
type PlaylistItem = {
  id: string;
  kind: "splat"|"pano"|"tour"|"video"|"image"|"gallery";
  url: string; poster?: string;
  bounds?: SplatBounds; normalizeMatrix?: number[];   // baked upstream (twin centering fix)
  meta?: { title?: string; yaw?: number; pitch?: number };
};
```

## 8. Reuse map (refactor, don't rebuild)
- Shell ← generalize `ViewerClient` / `TwinViewerCanvasShell` / `PublicItemStage`.
- Splat ← wrap existing `splat-viewer-scene.tsx` / `splat-overview-navigation` / `…-interior-…`;
  read baked `bounds`/`normalizeMatrix` from the manifest instead of recomputing.
- Pano ← wrap `TourPanoViewer` (disable its input; drive from intents).
- Chrome ← generalize `TwinViewerControlsOverlay`.

## 9. Cross-cutting
- **Embeds in reports**: `mediaEmbed` blocks mount `<SlatePlayer ... embed>` (chrome-less) per §3.
- **PDF**: not rendered live — the report PDF uses `poster` + QR/link (see report schema §6).
- **Analytics**: emit `share.viewed` (→ notification service) and per-item view counts.
- **Tokens**: viewing is free; only the upstream processing that produced the media was metered.

## 10. Build order
1. Shell + chrome + GestureLayer + manifest + Image/Gallery/Video adapters.
2. Pano adapter (wrap PSV).
3. Splat adapter (wrap Spark; read baked bounds; orbit/walk + recenter).
4. Fullscreen (screenfull + iOS portal); per-slot state persistence.
5. Embed mode + report integration; analytics/view-tracking.

## 11. Open items
- Tour hotspots / pins (PSV virtual-tour plugin) — phase 2.
- Comments/annotations overlay inside the player vs at the report level (lean: report level first).
- Adaptive video manifests (HLS) only if/when transcode pipeline emits them.
