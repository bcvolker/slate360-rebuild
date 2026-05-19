# App Store Readiness Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Determines readiness for iOS App Store and Google Play submission.

## Native Wrapper

| Item | Status | Verdict |
|---|---|---|
| Capacitor config | Not found | **BLOCKER** |
| android/ directory | Not found | **BLOCKER** |
| ios/ directory | Not found | **BLOCKER** |
| TWA config | Not found | **BLOCKER** |
| PWA manifest (manifest.ts) | Functional — standalone display, portrait orientation, proper icons, shortcuts | Ready as PWA |

**Verdict:** App is PWA-only. No native wrapper exists. App Store submission requires either Capacitor (recommended for iOS + Android) or TWA (Android only). This is the single largest blocker.

## App Icons & Splash Screens

| Item | Status |
|---|---|
| PWA icon 192x192 | ✅ public/uploads/icon-192.png |
| PWA icon 512x512 | ✅ public/uploads/icon-512.png |
| PWA maskable icon 512x512 | ✅ public/uploads/icon-512-maskable.png |
| SVG favicon | ✅ public/uploads/slate360-favicon-v2.svg |
| PWA screenshots (wide + narrow) | ✅ public/uploads/screenshot-wide.png, screenshot-narrow.png |
| iOS splash screens | ❌ Not found |
| apple-touch-icon meta tag | ❌ Not found |
| iOS webapp meta tags | ❌ Not found |
| Android adaptive icon | ❌ Not found (would need Capacitor) |

## Permissions

| Permission | Implementation | Status |
|---|---|---|
| Camera | getUserMedia via useCamera.ts hook | ✅ Functional |
| Microphone | getUserMedia via useAudioRecorder.ts | ✅ Functional |
| Geolocation | navigator.geolocation via useGeolocation.ts | ✅ Functional |
| File/photo library | File input elements | ✅ Functional |
| Permissions-Policy header | camera=(self), microphone=(self), geolocation=(self) in next.config.ts | ✅ Correctly configured |
| Push notifications | Not implemented | ❌ V2 |

## Required App Store Pages

| Page | Route | Status |
|---|---|---|
| Privacy Policy | /privacy | ✅ Full legal document (9+ sections) |
| Terms of Service | /terms | ✅ Full legal document (12+ sections) |
| Support / Help | — | ❌ No in-app route. support@slate360.ai referenced in Terms only |
| Account Deletion | /api/account/delete | ✅ Full implementation with Stripe cancellation and data cleanup |
| Account Deletion UI | Settings page | ✅ DELETE MY ACCOUNT confirmation flow |

## Reviewer / Demo Account Strategy

| Item | Status |
|---|---|
| App reviewer flag | ✅ profiles.is_app_reviewer bypasses approval gate |
| Demo account toggle | Via PATCH /api/admin/beta (set is_app_reviewer=true) |
| Reviewer bypasses middleware | ✅ is_app_reviewer skips pending-verification redirect |
| Pre-populated demo data | ❌ No demo worksite/walk/deliverables for reviewers |

## Hidden / Unfinished App Surfaces

| Check | Status |
|---|---|
| App Store mode filtering | ✅ APP_STORE_MODE defaults ON, hides comingSoon nav items |
| Nav filtering (sidebar/bottom/command/grid) | ✅ All surfaces filter |
| "Coming Soon" in authenticated surfaces | ⚠️ 2 instances: DashboardMyAccount.tsx, PunchListForm.tsx |
| Direct-URL reachable unfinished pages | ⚠️ /virtual-studio and /geospatial render ComingSoonEmptyState if navigated directly |
| Dead buttons | ✅ None found (0 empty onClick handlers) |
| Fake/demo data | ✅ None in production surfaces |
| Broken links | Unknown — needs manual testing |

## Mobile Performance

| Item | Status |
|---|---|
| Build output | Passes with strict TypeScript and ESLint checks |
| First Load JS shared | 207 KB (reasonable) |
| Site Walk preview route | 8-10 KB (light) |
| Sentry traces | 10% sample rate |
| Image optimization | Next.js Image component used |
| Bundle analysis | Not performed in this audit |

## Offline Behavior

| Item | Status |
|---|---|
| Service worker | Kill-switch mode — clears caches, unregisters self |
| Offline page | /~offline exists with retry button |
| Site Walk offline capture | IndexedDB queue + sync manager exist |
| General offline browsing | Not supported (no SW caching) |

## Error Handling

| Item | Status |
|---|---|
| Global error boundary | ✅ Sentry + user-facing UI |
| 404 page | ✅ Custom not-found.tsx |
| API error responses | ✅ Standardized via api-response.ts helpers |
| PII scrubbing | ✅ Sentry strips tokens, passwords, auth headers, cookies |

## Production Environment

| Service | Status |
|---|---|
| Vercel | ✅ Auto-deploys from main, latest deployment succeeded |
| Supabase | ✅ Production project hadnfcenpcfaeclczsmm |
| Trigger.dev | ✅ Working (plan rasterization) |
| S3/R2 storage | ✅ Cloudflare R2 primary, AWS S3 fallback |
| Stripe | ✅ Webhook handler + billing routes |
| Sentry | ✅ Client + server + edge configs |
| Security headers | ✅ HSTS, X-Frame-Options DENY, CSP, nosniff |

## App Store Submission Checklist

| # | Requirement | Status | Action Needed |
|---|---|---|---|
| 1 | Native wrapper | ❌ | Add Capacitor for iOS + Android |
| 2 | App icons (all sizes) | ⚠️ | Generate from existing 512x512 |
| 3 | Splash screens | ❌ | Create for iOS/Android |
| 4 | apple-touch-icon | ❌ | Add meta tag + icon |
| 5 | Privacy policy | ✅ | — |
| 6 | Terms | ✅ | — |
| 7 | Support contact | ❌ | Add in-app help/support route |
| 8 | Account deletion | ✅ | — |
| 9 | Reviewer account | ✅ | Pre-create and document |
| 10 | No Coming Soon in auth surfaces | ⚠️ | Remove 2 instances |
| 11 | No dead buttons | ✅ | — |
| 12 | No fake data | ✅ | — |
| 13 | Camera permission usage description | ❌ | Needed in native Info.plist |
| 14 | Location permission usage description | ❌ | Needed in native Info.plist |
| 15 | Photo library permission description | ❌ | Needed in native Info.plist |
| 16 | App screenshots for store listing | ❌ | Need 6.7" and 5.5" (iOS), phone + tablet (Android) |
| 17 | App description / keywords | ❌ | Need store listing copy |
| 18 | Age rating questionnaire | ❌ | Need to fill out |
| 19 | Export compliance | ❌ | HTTPS = yes encryption, need to declare |
