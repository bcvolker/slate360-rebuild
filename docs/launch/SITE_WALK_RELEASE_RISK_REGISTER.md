# Site Walk Release Risk Register

Last Updated: 2026-05-14
Status: Planning document. No code changes.

## Risk Matrix

| # | Risk | Severity | Likelihood | Mitigation | Owner |
|---|---|---|---|---|---|
| 1 | **Old UI leak** — production routes still serve old pill-heavy/stacked-header UI after V1 components are built | High | High (currently true) | Swap production route imports to V1 components. Test every route renders V1 shell. Verify no old SiteWalkShell/SiteWalkModuleNav renders. | Agent + human review |
| 2 | **Hidden unfinished app surfaces** — /virtual-studio, /geospatial, project-hub PM tools reachable by direct URL | Medium | Medium | Ensure app-store-mode filtering blocks route rendering, not just nav hiding. Add middleware redirects for unreleased routes. Remove "Coming Soon" from 2 authenticated surfaces. | Agent |
| 3 | **Plan/capture regression** — touching PlanViewerLeaflet for pin move/delete breaks pan/zoom or pin creation | Critical | Medium | Isolate pin move/delete changes. Test: pan/zoom, empty-area long-press creates pin, saved pin opens, capture saves, return to plan. Never modify plan loading, image fetching, or Leaflet initialization. | Agent + phone test |
| 4 | **App Store rejection — Apple** | High | Medium | Common reasons: missing permission descriptions, "Coming Soon" text, WebView behavior, no content for reviewer. Mitigate: prepare reviewer account with pre-populated data, add Info.plist permission descriptions, remove all placeholder language. | Human |
| 5 | **App Store rejection — Google** | Medium | Low | Google Play is generally more lenient. Main risks: target API level compliance, permission declarations. | Human |
| 6 | **Google closed testing timing** — Google may require 14-day closed testing period before production release | High | Medium | Start internal testing track immediately when AAB is ready. If required, this adds 2 weeks to timeline. Check current Google Play policy for new developer accounts. | Human |
| 7 | **iOS PWA/cache/native wrapper issue** — WebView rendering differences, keyboard avoidance, safe-area, viewport issues in Capacitor | Medium | High | Service worker is already in kill-switch mode (good — avoids stale cache). Use viewport-fit=cover. Test keyboard behavior in bottom sheets. Test safe-area padding in native wrapper. Budget extra day for iOS-specific fixes. | Agent + phone test |
| 8 | **Permissions/privacy issue** — camera/location/microphone permission denials, missing usage descriptions, GDPR compliance gaps | Medium | Medium | Permissions-Policy header is correct. Add graceful fallbacks when permissions denied. Ensure privacy policy covers all data collection. Add Info.plist/AndroidManifest permission descriptions during Capacitor setup. | Agent |
| 9 | **Deliverables not valuable enough** — basic PDF export with placeholder images may underwhelm users | Medium | High | For foundational launch, focus on visual walk summary with real photos + share link. Interactive viewers are V2. Ensure PDF export includes actual captured images, not placeholders. | Agent |
| 10 | **Operations approval not ready** — owner can't efficiently approve users at scale | Low | Low | Current access queue works for <100 users. For scale, add bulk approve, email notifications on signup. | Agent (V2) |
| 11 | **Collaborator workflow incomplete** — collaborator can see projects but can't do much inside them | Medium | Medium | Ensure collaborators can view walks, view captures, add comments. Limit: no deliverable creation, no plan upload. Document limitations. | Agent |
| 12 | **Offline capture failure** — IndexedDB queue exists but untested on real devices, could lose captures | Critical | Medium | Test on physical phone: enable airplane mode, capture 3 photos, disable airplane mode, verify sync. If sync fails, add manual retry UI. | Phone test |
| 13 | **Three billing models confusion** — legacy tier, modular, and SKU models all exist and partially overlap | Medium | Low (for foundational) | For foundational launch with beta mode on, billing is irrelevant. For monetized V1, consolidate to one model and disable the others. | Human decision |
| 14 | **Real-time collaboration untested** — Supabase Realtime subscriptions on items/pins/comments/sheets exist but never tested multi-user | Medium | Medium | Test: two browser tabs, create item in one, verify it appears in other. If broken, disable realtime for V1 and use manual refresh. | Agent + test |
| 15 | **Notification system absent** — no way to notify users of assignments, comments, or approvals | Medium | High (currently true) | For foundational launch, email notifications on assignment/comment are sufficient. Build in-app notification feed for V2. Use existing email infrastructure (Resend). | Agent |
| 16 | **Plan sheet navigation missing** — multi-sheet plans are unusable without switching UI | High | High (currently true) | Build minimal sheet picker (dropdown or horizontal strip). This is required for any user with multi-page plan PDFs. | Agent |
| 17 | **Landscape phone layout broken** — users in the field rotate phones frequently | Medium | High | Add basic landscape CSS for plan workspace (maximize canvas) and capture (side-by-side layout). Other surfaces can stay portrait-layout in landscape. | Agent |

## Risk Severity Legend

- **Critical:** Could cause data loss, broken core workflow, or immediate app rejection
- **High:** Would significantly degrade user experience or block submission
- **Medium:** Noticeable issue but has workaround
- **Low:** Minor or deferrable

## Top 5 Risks by Combined Impact

1. **Plan/capture regression** (Critical × Medium) — the core working loop must not break
2. **Offline capture failure** (Critical × Medium) — data loss risk for field users
3. **Old UI leak** (High × High) — users would see broken old UI
4. **Plan sheet navigation missing** (High × High) — multi-sheet plans unusable
5. **iOS native wrapper issues** (Medium × High) — unpredictable WebView behavior
