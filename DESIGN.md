# Slate360 Design System

Last Updated: 2026-04-28

## Aesthetic Direction: Dark Glass

We use a **Dark Glass** aesthetic. This uses deep Zinc/Charcoal surfaces with glassmorphic effects (semi-transparent backgrounds, backdrop blur, subtle borders). The primary app-shell accent is the Slate360 cobalt family (`#3B82F6` / hover `#2563EB`) with steel/slate neutrals.

All primary buttons, links, active states, focus rings, and interactive highlights should use cobalt or semantic CSS tokens that resolve to cobalt. Yellow, gold, amber, and orange are legacy accents and must not be used for primary Site Walk controls.

## CSS Custom Properties (globals.css)

Add these to `:root` and `.dark` in `app/globals.css`.

### Light Theme
```css
:root {
  /* Surfaces */
  --background: 0 0% 100%;           /* white */
  --surface: 0 0% 98%;               /* zinc-50 */
  --surface-secondary: 0 0% 95%;     /* zinc-100 */
  --glass-surface: 0 0% 100% / 0.85; /* glass with blur */
  
  /* Text */
  --text-primary: 240 10% 10%;       /* near black */
  --text-secondary: 240 5% 35%;      /* zinc-700 */
  --text-muted: 240 4% 55%;          /* zinc-500 */
  
  /* Borders */
  --border: 240 5% 85%;              /* zinc-200 */
  --border-glass: 0 0% 0% / 0.08;
  
   /* Accent - Slate360 cobalt */
   --primary: 217 91% 60%;            /* #3B82F6 */
   --primary-foreground: 0 0% 100%;
   --primary-hover: 221 83% 53%;      /* #2563EB */
  
  /* Status */
  --success: 142 76% 36%;
  --destructive: 0 84% 60%;
  --warning: 38 92% 50%;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-glass: 0 8px 32px -4px rgb(0 0 0 / 0.12);
}
```

### Dark Theme (Default - Dark Glass)
```css
.dark {
  /* Surfaces - Charcoal/Zinc with Glass */
  --background: 240 10% 3.9%;        /* zinc-950 */
  --surface: 240 10% 9%;             /* zinc-900 (charcoal glass base) */
  --surface-secondary: 240 10% 12%;  /* zinc-800 */
  --glass-surface: 240 10% 9% / 0.75; /* semi-transparent for glassmorphism */
  
  /* Text */
  --text-primary: 0 0% 98%;
  --text-secondary: 240 5% 65%;
  --text-muted: 240 5% 48%;
  
  /* Borders */
  --border: 240 5% 16%;              /* zinc-800 */
  --border-glass: 0 0% 100% / 0.12;
  
   /* Accent - Slate360 cobalt */
   --primary: 217 91% 60%;            /* #3B82F6 */
   --primary-foreground: 0 0% 100%;
   --primary-hover: 221 83% 53%;      /* #2563EB */
  
  /* Status */
  --success: 142 76% 36%;
  --destructive: 0 84% 60%;
  --warning: 38 92% 50%;
  
  /* Glass Effects */
  --backdrop-blur: blur(16px);
  --glass-border: 1px solid hsl(var(--border-glass));
  
  /* Shadows */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3);
  --shadow-glass: 0 8px 32px -4px rgb(0 0 0 / 0.4);
}
```

### Usage Examples

**Glass Card:**
```css
.bg-glass {
  background: hsl(var(--glass-surface));
  backdrop-filter: var(--backdrop-blur);
  border: var(--glass-border);
  box-shadow: var(--shadow-glass);
}
```

**Primary Button:**
```tsx
<button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))]">
  Primary Action
</button>
```

**Active State / Focus:**
- All active nav items, selected tabs, checkboxes: use `--primary`
- Focus rings: `ring-2 ring-[hsl(var(--primary))]/40`

All remaining orange/yellow/gold primary-control references should be replaced with `--primary`, `bg-blue-600`, `text-blue-*`, or token-backed cobalt utilities.

## Component Standards

- **Cards & Panels**: `bg-[hsl(var(--surface))]` or `.bg-glass` for elevated panels
- **Primary CTAs**: Cobalt background, white text
- **Secondary**: `border border-[hsl(var(--border))]` with cobalt hover accent
- **Interactive highlights**: Cobalt for selected scene, active hotspot, progress bars
- **Mobile**: Larger touch targets (min 44px), prominent upload zones

Update `app/globals.css` and run a global audit for any remaining orange/yellow/gold/navy primary-control references.

---

## 360 Tour Builder - Mobile Upload UX (iPad SD Card Reader Flow)

**Mobile-First Upload Philosophy**: Non-blocking, resumable, optimistic. The user must never be prevented from continuing to build scenes while uploads are in progress or recovering from drops.

### Flow for SD Card Reader on iPad

1. **Entry Point (Builder Screen)**
   - Prominent floating "+" button (bottom-right, gold accent) labeled "Add Scenes"
   - On tap: opens native file picker with `accept="image/jpeg,image/jpg" multiple`
   - iOS/iPadOS will show "Files" app integration. User can browse to the SD card mounted via Lightning/USB-C reader.

2. **File Selection**
   - Supports multiple selection (large batches of 20-50 panoramas common).
   - Shows preview thumbnails inline as selected.
   - File count and total size estimate displayed ("42 files • 1.8 GB").
   - Warning if any file > tier limit or wrong aspect ratio (soft warning, does not block).

3. **Upload Queue Panel (Non-blocking)**
   - After selection, a slide-up "Upload Queue" sheet appears (not modal — can be dismissed).
   - Queue shows list with filename, progress bar (gold), status ("Uploading...", "Queued", "Completed", "Failed").
   - User can immediately return to scene creation while uploads run in background.
   - Queue persists across navigation (stored in IndexedDB + synced to server).

4. **Progress Indicators**
   - Global top-bar progress pill when uploads active: "12/42 uploading • 68%".
   - Individual scene cards show "Uploading..." overlay with progress ring (gold).
   - Once uploaded, scene thumbnail appears instantly (optimistic UI) with "Processing" label until S3 metadata confirmed.
   - Background uploads use Service Worker where possible for resilience.

5. **Connection Drop Resilience**
   - On disconnect: uploads pause gracefully with "Connection lost — will resume automatically".
   - Uses exponential backoff + resumable uploads (via S3 multipart if >50MB or via custom chunking).
   - On reconnect: queue auto-resumes without user action.
   - User can create scenes, add hotspots, edit branding while offline — changes queued locally and synced when back online.
   - No blocking dialogs. A small persistent "Syncing..." badge appears in header when there is pending work.

6. **Post-Upload**
   - Completed scenes auto-add to the left sidebar library in upload order.
   - User can drag to reorder immediately.
   - Failed files have "Retry" button (gold) and "Remove" option.

**iPad-Specific Optimizations**:
- Leverage Files app deep integration for SD readers.
- Large tap targets.
- Support split-view multitasking (user can have Files app open beside Slate360).
- Keyboard shortcuts for power users (Cmd+U for upload).

---

## Video Hotspot Strategy — Short MP4 Hotspots in 360 Photos

**Decision**: Full 360-video support is deferred due to cost and complexity. Instead, we implement lightweight **Video Hotspots**: short MP4 clips (recommended ≤15 seconds) pinned to specific yaw/pitch coordinates within a 360 photo scene.

### UX Flow for Adding a Video Hotspot

1. **Enter Hotspot Mode**
   - In the 360 viewer (Pannellum), user clicks "Add Hotspot" from toolbar (gold button).
   - Viewer enters "placement mode" — cursor becomes crosshair.
   - User clicks/taps on the panorama to set yaw/pitch. A temporary gold pin appears.

2. **Hotspot Type Selection**
   - Sheet opens: "Image", "Text", "Video", "Link", "Info".
   - Choose **Video**.

3. **Video Upload**
   - "Upload MP4" button opens file picker (`accept="video/mp4"`, max 50MB recommended).
   - Auto-trims to first 15 seconds if longer (client-side using video element + canvas or FFmpeg.wasm for heavier clips).
   - Preview player shows the clip.
   - Optional: title, autoplay toggle (default on), loop toggle, muted (default on for hotspots).

4. **Pinning & Configuration**
   - Hotspot is placed at the exact yaw/pitch clicked.
   - Controls:
     - Scale slider (video appears as floating plane/billboard in 3D space).
     - "Always face camera" toggle (billboard mode).
     - Playback controls preview in the 360 viewer.
   - User can drag the hotspot in the viewer to adjust position.

5. **Persistence**
   - Stored in `tour_hotspots` table with:
     - `scene_id`
     - `type: "video"`
     - `yaw`, `pitch`
     - `asset_path` (S3 URL)
     - `duration`, `autoplay`, `loop`, `muted`
     - `scale`
   - Video transcoded to optimized MP4 (H.264, 720p) server-side for compatibility.

6. **Viewer Experience**
   - When user looks near the hotspot (within FOV), the video thumbnail appears as a 3D plane.
   - On click/tap: video plays inline (using HTML5 video with transparent controls).
   - Short clips recommended so they don't dominate bandwidth or distract from the 360 experience.
   - "Close" button returns to panorama.

**Best Practices Prompts in UI**:
- "Keep clips under 15 seconds for best performance."
- "Recommended: 720p, H.264, <30MB".
- Auto-suggest trimming longer videos.

This approach gives rich media without the heavy cost of full 360 video pipelines.

Update `BUILD_GUIDE.md` and `IMPLEMENTATION_PLAN.md` with these flows in the next session.
