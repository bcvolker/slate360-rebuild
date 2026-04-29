# Slate360 Performance Audit — 2026-04-29

Scope: Slate360 App Shell, Site Walk capture, Design Studio, 360 Tours, Content Studio, PWA/App Store readiness, and desktop web performance.

## Executive Verdict

Slate360 can ship as a PWA/web app, but it is not yet App Store performance-ready. The biggest risks are not one single bug; they are accumulated mobile WebView costs: too many client components, heavy interactive modules loaded inside shared surfaces, expensive canvas/image workflows, broad telemetry defaults, and several known monoliths that make accidental rerenders and save bugs likely.

The highest-value direction is: keep the App Shell extremely thin, lazy-load every heavy app only when entered, compress/resize media before upload/render, make save/sync observable and idempotent, and add real mobile performance tests around Site Walk capture.

## Findings Ranked by Risk

### P0 — Mobile capture must be treated as a performance-critical native-like workflow

Evidence:
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` is 299 lines and handles image rendering, pointer tracking, pinch/zoom, long-press, markup state, undo/redo, text editing, attachment pins, and save emission.
- `components/site-walk/capture/CameraViewfinder.tsx` creates full-size object URLs from original camera files.
- `components/site-walk/capture/useCaptureItems.ts` autosaves after local state changes and queues offline patches.

Risk:
- Raw mobile camera images can be 3–12MB+ and huge dimensions. Rendering them directly in `<img>` plus SVG overlays can stutter, drain battery, and increase memory pressure.
- Pointer moves can update React state frequently.
- Markup save callbacks can cause parent rerenders if not throttled carefully.

Recommended next steps:
1. Extract `PhotoMarkupCanvas` before adding features: gesture state, rendering, markup tools, and pin layer should be separate files.
2. Add client-side image downscaling for preview and upload targets.
3. Keep original file only if needed; render a preview-sized blob in the canvas.
4. Throttle pointer move state writes with `requestAnimationFrame`.
5. Debounce markup persistence at 800–1200ms and flush on Next/Back/visibilitychange.
6. Add a real mobile test script for capture → markup → pin → Next → Back.

### P0 — App Shell must not mount heavy modules globally

Evidence:
- `components/dashboard/AppShell.tsx` always mounts mobile topbar, mobile bottom nav, command palette, invite modal provider, install strip, and shared providers.
- `components/providers/ClientProviders.tsx` dynamically loads Theme, PostHog, service-worker cleanup, offline banner, and install banner globally.
- There are 372 client components.

Risk:
- A wrapped PWA/WebView app will feel slow if the shell loads global effects and modals before the active tool is interactive.
- Command palette and invite/share plumbing should stay lazy until opened where possible.

Recommended next steps:
1. Make `CommandPalette` dynamic and only load when first opened.
2. Make invite modal body dynamic and only load when opened.
3. Keep mobile nav/topbar lightweight and avoid hidden heavy descendants.
4. Add an App Store mode that hides unfinished apps and removes install-banner logic inside native wrappers.

### P0 — Observability defaults were too expensive

Evidence before fix:
- `components/providers/PostHogProvider.tsx` used `autocapture: true` and `capture_pageleave: true`.
- `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` used `tracesSampleRate: 1.0`.

Change made in this audit:
- PostHog autocapture is now opt-in via `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=true`.
- PostHog pageleave capture is disabled.
- Sentry trace sample defaults to `0.1`, overrideable via `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` / `SENTRY_TRACES_SAMPLE_RATE`.
- Sentry replay-on-error defaults to `0.1`, overrideable via `NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE`.

Recommended next steps:
1. Keep high sampling only in short debugging windows.
2. Use targeted custom events for monetization funnels instead of DOM autocapture.
3. Do not enable session replay globally for field capture until battery/memory impact is profiled.

### P1 — Heavy modules must be route-level lazy chunks

Evidence:
- `components/dashboard/LocationMap.tsx` is 1892 lines and loads Google Maps / map drawing / export behavior.
- `components/dashboard/DashboardWidgetRenderer.tsx` imports `LocationMap`, `CalendarWidget`, contacts, SlateDrop widget, and many icons in one client file.
- `components/tours/TourPanoViewer.tsx` imports `@photo-sphere-viewer/core` directly.
- `components/ModelViewerClient.tsx` loads external model-viewer script and enables `auto-rotate` by default.
- `components/content-studio/AssetEditorClient.tsx` renders full images/videos directly from download URLs.

Risk:
- Dashboard widget renderer can pull heavy widget dependencies into broader chunks.
- 360 viewer and model viewer are GPU-heavy and can drain battery.
- Auto-rotate keeps GPU active even while the user is not interacting.

Recommended next steps:
1. Dynamic import LocationMap only when its widget is visible/expanded.
2. Split `DashboardWidgetRenderer` by widget family.
3. Lazy-load `TourPanoViewer` only after the scene is selected/visible.
4. Disable `model-viewer` auto-rotate by default; enable only on explicit preview/demo.
5. Pause/destroy 360/model viewers when hidden, tabbed away, or backgrounded.
6. For Content Studio, use thumbnails/transcoded previews instead of original images/videos.

### P1 — Service worker is currently a kill-switch, so offline app-shell caching is intentionally absent

Evidence:
- `app/sw.ts` unregisters itself and clears caches.
- `components/providers/SWRegistrar.tsx` runs cleanup in production until disabled marker is set.

Risk:
- This is correct for avoiding stale CSS/HTML bugs, but it means the PWA will not get app-shell caching speedups yet.
- App Store WebView will still rely on network for app shell unless native wrapper caching or a redesigned service worker is added.

Recommended next steps:
1. Keep HTML/CSS/JS caching disabled until real-device tests prove correctness.
2. Later add a versioned app-shell cache for static assets only, never stale HTML.
3. Keep Site Walk offline capture as IndexedDB queue, not service-worker magic.

### P1 — Realtime and polling need strict scope controls

Evidence:
- `lib/site-walk/sync-manager.ts` polls offline queue every 15 seconds while started.
- `lib/hooks/useSiteWalkRealtime.ts` subscribes to all `site_walk_pins` without a DB filter.
- `components/site-walk/live/useRealtimeWalk.ts` is scoped correctly by session.
- `app/view/[token]/CommentThread.tsx` polls every 15 seconds.

Risk:
- On battery-sensitive mobile sessions, unnecessary polling/realtime subscriptions are costly.
- Unfiltered pin subscriptions can become expensive at scale.

Recommended next steps:
1. Start sync polling only while Site Walk capture/live views are mounted.
2. Back off sync interval when page hidden or battery saver is detected.
3. Filter `site_walk_pins` by active session/plan/project if schema allows.
4. Pause comment polling when tab hidden.

### P1 — Production build still reports warnings and is slow to validate

Observed during guard run:
- Build stability guard started a production build and emitted Sentry instrumentation deprecation warning.
- Webpack cache warned about serializing 133–184KiB strings.
- Build/type validation was still running when checked.

Recommended next steps:
1. Rename/migrate `sentry.client.config.ts` to `instrumentation-client.ts` per Next/Sentry warning.
2. Investigate large serialized webpack strings with bundle analysis.
3. Add bundle budget checks for app shell, Site Walk capture, tours, and model viewer.

### P2 — Known oversized files are still risk multipliers

Largest active files found:
- `components/dashboard/LocationMap.tsx` — 1892 lines.
- `components/marketing-homepage.tsx` — 1164 lines.
- `components/ui/sidebar.tsx` — 726 lines.
- `components/project-hub/ProjectDashboardGrid.tsx` — 591 lines.
- `components/dashboard/DashboardWidgetRenderer.tsx` — 547 lines.
- `components/widgets/WidgetBodies.tsx` — 475 lines.
- `components/calendar/CalendarWidget.tsx` — 466 lines.
- `components/project-hub/WizardLocationPicker.tsx` — 412 lines.

Risk:
- Large client files are harder to memoize, harder to lazy-load, and easier to break with partial fixes.

Recommended next steps:
1. Extract LocationMap into map core, toolbar, directions, share/export, overlay drawing, hooks.
2. Split DashboardWidgetRenderer into per-widget lazy components.
3. Keep all new performance work under 300 lines per production file.

## App Store / Native Wrapper Performance Reality

If the App Store build is only a WebView wrapper around the current PWA, it will not automatically become fast. It may feel slightly better because browser chrome/address-bar resizing goes away, but React render cost, media decoding, canvas work, telemetry, network waits, and storage design remain the same.

It can feel meaningfully better if the wrapper adds native help for:
- camera capture and compression;
- background upload queues;
- file picker and local file cache;
- native permission prompts;
- crash/performance monitoring tuned for mobile;
- push notifications;
- app-shell preloading.

The web app and app-store app should share the same Next.js product logic, but the wrapper should handle device-native edges and should expose an `APP_STORE_MODE`/native flag that disables install prompts, unfinished modules, and browser-only affordances.

## Immediate Quick Wins

1. Disable PostHog autocapture by default. Done in this audit.
2. Lower Sentry trace/replay sampling by default. Done in this audit.
3. Dynamic import `CommandPalette` and Invite modal body.
4. Dynamic import heavy dashboard widgets.
5. Disable `model-viewer` auto-rotate by default.
6. Add image preview compression for Site Walk capture.
7. Add `requestAnimationFrame` throttling to photo/plan pointer move transforms.
8. Add mobile capture Playwright/manual test gate.
9. Add route-level bundle budgets.
10. Add App Store mode feature flag gate for unfinished modules.

## Validation Run During Audit

Commands run:
- Static line-count/client-component/listener scan.
- `npm run guard:build-stability && npm run guard:architecture && npm run typecheck` was started. It reached production build/type validation and emitted Sentry/webpack warnings. Re-check terminal before relying on final status.

Known non-code artifact:
- `public/uploads/marked up.jpg` is untracked and intentionally not part of commits unless requested.

## Second-Opinion Prompt

Use this prompt with another AI assistant that has repo access:

```text
You are reviewing the Slate360 repo (`bcvolker/slate360-rebuild`) for paranoid mobile/web performance before PWA-to-iOS/Android App Store monetization. Be critical and assume users will run the app in mobile Safari/Chrome PWA, WebView wrappers, and desktop web.

Read first:
1. `SLATE360_PROJECT_MEMORY.md` latest handoff.
2. `docs/PERFORMANCE_AUDIT_2026-04-29.md`.
3. Only the files needed to verify/refute the audit findings.

Focus areas:
- Slate360 App Shell performance and global providers.
- Site Walk capture performance, save reliability, IndexedDB/offline sync, photo markup, long-press pins, image memory usage.
- Design Studio model viewer performance and battery use.
- 360 Tours panorama viewer performance and cleanup.
- Content Studio media preview and upload/download behavior.
- Dashboard/widget chunking, especially `LocationMap` and `DashboardWidgetRenderer`.
- Telemetry overhead: Sentry, PostHog, service worker cleanup, browser events.
- App Store mode readiness: hidden unfinished modules, no install banners, no dead buttons, no browser-only UX.

Please return:
1. Top 10 performance/battery risks ranked P0/P1/P2.
2. Any correctness/save bugs likely caused by rerenders, stale closures, optimistic state replacement, or offline sync races.
3. Concrete file-level fixes with smallest safe patches.
4. Which fixes you would do first this week before more feature work.
5. Any findings where you disagree with the current audit and why.

Do not make broad cosmetic changes. Do not exceed 300 lines in production TS/TSX/JS files. If you recommend a new helper, confirm where it is imported and used.
```
