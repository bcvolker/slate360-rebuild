# Master Issue Log Cross-Reference (vs current build plan)

Last updated: 2026-04-19
Source: User-provided 10-category beta-readiness audit.
Legend: ✅ shipped to `main` · ⏳ queued in current rounds · 🔜 added to backlog now · ❌ not yet planned (decision needed)

---

## 1. Auth / Login UI
| Issue | Status | Where |
|---|---|---|
| Login page off-brand / inconsistent | ⏳ Queued | UNIT #19 (Production smoke) — re-skinning login surface to dark/cobalt token system |
| "Forgot password" flow untested in prod | 🔜 Added | UNIT #19 smoke checklist |
| Sign-up does not auto-grant beta_tester | ✅ Shipped | `app/api/beta/join/route.ts` (PR #11) — UI nudge to call still pending in #15 |
| No "Continue with Google/Apple" | ❌ Not planned | Defer post-beta — flag for decision |

## 2. App download / install pipeline
| Issue | Status | Where |
|---|---|---|
| "Get the App" CTA on homepage missing/dead | ✅ Shipped | "Get the App — Free" hero CTA (PR #9) |
| No PWA installable target | ⏳ Queued | UNIT #20 — `app/manifest.ts` rewrite + `/app` scope (in current code request to other AI, Section C4) |
| iOS install instructions modal | 🔜 Added | UNIT #20b — to add after `/app` lands |
| App-store-style screenshots / landing | ❌ Not planned | Marketing page work — flag for decision |

## 3. App-vs-web confusion
| Issue | Status | Where |
|---|---|---|
| Single URL serves both, mobile users see desktop chrome | ⏳ Queued | UNIT #20 — `/app` route group with `MobileAppShell` (Section C of current code request) |
| Marketing site, desktop dashboard, mobile app all blur into one | ⏳ Queued | UNIT #20 + UNIT #21 (Command Center reimagine) split surfaces cleanly |
| PWA opens at `/` not `/app` | ⏳ Queued | UNIT #20 manifest update sets `start_url: /app` |

## 4. Command Center problems
| Issue | Status | Where |
|---|---|---|
| Sidebar disappeared on /site-walk, /slatedrop | ✅ Shipped | AppShell extraction (PR #11) |
| Sidebar default-collapsed (users missed nav) | ✅ Shipped | Default-open + persisted pin (PR #9) |
| Logo color drift across surfaces | ✅ Shipped | SlateLogo cobalt source-of-truth (PR #9) |
| Topbar lacks credits / beta indicators | ⏳ Queued | UNIT #16 (Credit Meter pill) + UNIT #17 (Beta Banner) — current code request Sections A+B |
| Command Center grid feels static / low signal | ⏳ Queued | UNIT #21 — Command Center reimagine (after #16/#17/#18/#20 land) |
| No "what changed since last visit" feed | 🔜 Added | UNIT #21 scope |

## 5. SlateDrop rebuild
| Issue | Status | Where |
|---|---|---|
| SlateDrop layout broken (no sidebar) | ✅ Shipped | `app/slatedrop/layout.tsx` uses AuthedAppShell (PR #11) |
| Drop creation flow untested end-to-end | 🔜 Added | UNIT #19 smoke checklist |
| Recipient view UX needs audit | ❌ Not planned | Flag — separate unit after #21 |
| Storage path: S3 vs R2 ambiguity for drops | 🔜 Added | UNIT #22 (new) — storage routing policy doc |

## 6. Project system
| Issue | Status | Where |
|---|---|---|
| `project_folders` vs `file_folders` schema confusion | ✅ Resolved | Non-negotiable #10 enforces `project_folders` |
| Project list on mobile has no view | ⏳ Queued | UNIT #20 — `/app/projects` page in current request |
| Pin/unpin from desktop missing | 🔜 Added | UNIT #21 scope (Pinned Projects on Command Center + mobile home) |
| Project sharing roles untested | 🔜 Added | UNIT #19 smoke checklist |

## 7. Site Walk Phase 1
| Issue | Status | Where |
|---|---|---|
| Site Walk lost AppShell chrome | ✅ Shipped | `app/site-walk/layout.tsx` uses AuthedAppShell (PR #11) |
| Capture → upload → review loop incomplete | ❌ Not planned | UNIT #23 (new) — Site Walk Phase 1 closeout. Flag for prioritization. |
| Sharing a walk has no notification | 🔜 Added | UNIT #23 scope |
| Mobile capture entry point missing | ⏳ Queued | UNIT #20 — `/app/captures` page placeholder lands now, real capture in #23 |

## 8. Operations Console
| Issue | Status | Where |
|---|---|---|
| `/ops` access via `canAccessOperationsConsole` | ✅ Already wired | `resolveServerOrgContext()` returns flag, AppShell uses it |
| Beta tester roster view | 🔜 Added | UNIT #24 (new) — Ops Console: Beta Roster + Cap counter |
| Credit ledger admin view | 🔜 Added | UNIT #24 scope (reuse `getCreditLedger`) |
| Per-org usage dashboard | 🔜 Added | UNIT #24 scope |

## 9. Mobile usability
| Issue | Status | Where |
|---|---|---|
| Touch targets too small on dashboard | ⏳ Queued | UNIT #20 — `/app` shell uses ≥44px touch targets by spec |
| Dashboard chrome unusable on phone | ⏳ Queued | UNIT #20 — phone users get `/app` instead |
| Bottom nav missing | ⏳ Queued | UNIT #20 — `MobileAppShell` 5-tab bottom nav (Section C2 of code request) |
| Standalone PWA detection | ⏳ Queued | UNIT #20 — `useIsStandalone` hook (Section C5) |

## 10. Data / usage backend visibility
| Issue | Status | Where |
|---|---|---|
| User has no way to see credits remaining | ⏳ Queued | UNIT #16 — Credit Meter pill + ledger sheet (Section A) |
| No ledger of credit consumption | ⏳ Queued | UNIT #16 — `getCreditLedger` + `CreditLedgerList` (Section A2/A5) |
| Storage usage hidden | 🔜 Added | UNIT #25 (new) — Storage meter on `/app/account` and Command Center |
| Render/job queue invisible | 🔜 Added | UNIT #25 scope |
| Beta limits not surfaced | ⏳ Queued | UNIT #16 — `limit` field uses `BETA_LIMITS.credits` for beta users |

---

## Net new units added this pass
- **#22** Storage routing policy (S3 vs R2) for drops + uploads
- **#23** Site Walk Phase 1 capture→review closeout
- **#24** Operations Console: Beta Roster, Credit Ledger admin, Org usage
- **#25** Usage visibility: storage + jobs meters surfaced to user

## Items still requiring user decision (❌)
- Social sign-in providers (Google/Apple) — not in beta scope?
- App-store-style marketing landing — defer until paid plans open?
- Recipient-view UX audit on SlateDrop — separate sprint?

## Already-shipped highlights since last cross-check
- PR #8: brand token migration to main
- PR #9: cobalt logo + sidebar default + topbar fixes
- PR #10: BetaGatedButton wired into all paywall CTAs
- PR #11: AppShell extraction (Site Walk + SlateDrop now have chrome) + beta join API
- 13 test users deleted from live Supabase (only `slate360ceo@gmail.com` remains)
- All service credentials confirmed working from dev container (Supabase pooler, S3, R2, Stripe, gh CLI, Vercel auto-deploy)
