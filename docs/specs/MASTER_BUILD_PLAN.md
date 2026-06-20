# Slate360 Master Build Plan — Status & Roadmap

Status: **planning complete for the core scope; build not yet started.** This is the index +
status tracker + consolidated roadmap, synthesizing the full A–R research (multiple independent
external AI passes, all strongly convergent) against the repo.

## 1. Locked assumptions (corrected against CEO decisions)
1. ~~"Site Walk only at first release."~~ **CORRECTED — CEO: ship Site Walk AND Twin 360 visibly.**
   (Update `AGENTS.md` + `GRAPHITE_GLASS.md §4` + `SLATE360_V1_APP_SHELL_UX_ARCHITECTURE.md` at build time.)
2. **Workspace = a default "General" project**; ad-hoc walks attach there. ✅
3. **Enterprise via sales quote + manual seat provisioning** (no consumer IAP SKU). ✅
4. **Tokens meter Modal GPU jobs** (twin/thermal/heavy enhance/PDF); basic photo capture is free;
   optional AI features metered. ✅
5. **Trial requires a payment method** + server-side hard caps. ✅

## 2. What the A–R research confirmed (high confidence)
Two-layer chrome + capture pill (O/A) · offline = Capacitor FS + Dexie + foreground multipart, not
Background-Sync-dependent (B) · ghost = plan-pin first, cloud VPR later (C) · Capacitor for stores +
RevenueCat (D/E) · margin in subscription allowance, overage at cost, trial hard-capped server-side
(F/G) · consolidate 3 entitlement models → one config-driven layer + token ledger + dispatcher holds
(H) · unified player shell + adapters, keep Spark, bake splat orientation/bounds upstream (I/J) ·
keep custom SlateDrop (K) · one notification events table → Trigger fan-out (L) · tokenized ICS feeds
(M) · one React template → Puppeteer PDF (N) · Project is the shared spine, merge Workspace (R).

## 3. Spec index (all pushed to this branch)
Top-level: `PLATFORM_PRODUCT_PLAN`, `MOBILE_UX_DECISIONS_AND_MONETIZATION`, `FEATURE_SPECS`,
`RESEARCH_SYNTHESIS_AND_DECISIONS`, `REPORT_BLOCK_SCHEMA`, `AI_PLATFORM_BRIEF`.
`docs/specs/`: `UI_NAV_BRANDING_UNIFICATION`, `UNIFIED_SLATE_PLAYER`, `NOTIFICATION_SERVICE`,
`SLATEDROP_PERMISSIONS`, `REPORT_EDITOR`, `TOKEN_UX`, `ENTERPRISE_CONSOLE`, `PROJECT_SPINE`,
`OFFLINE_CAPTURE`, `GHOST_MODE`, `STORE_IAP_ENTITLEMENTS`, `RESEARCH_PROMPTS_O-R`, and this file.

## 4. Planning status
**DONE (specified end-to-end):** navigation/branding unification; project spine; offline capture;
ghost mode; unified media player; twin viewer fix; reports (block model + dual layout + voice memos
+ comments); report editor; SlateDrop permissions; notifications; calendar; token UX; entitlement
consolidation; store/IAP; enterprise console.
**REMAINING PLANNING (small):**
- Final **pricing/token numbers** (CEO to provide) → fill config tables.
- **Launch-monetization decision** (IAP at launch vs later — `STORE_IAP_ENTITLEMENTS §6`).
- Optional file-level specs (report block schema → SQL; route manifest format) — can be done as we build.

## 5. Build status — NOTHING BUILT YET (we are pre-implementation)
"Finishing the apps" = executing the phases below. Two known **shovel-ready quick wins** unblock the
most: create the missing `/app/slatedrop/page.tsx`; bake splat orientation/bounds in the Modal worker.

| Phase | What it delivers | Specs |
|---|---|---|
| **0 — Foundations** | nav-truth (two-layer chrome, module swap, active-tab fix), route manifest, delete dead chrome, `/slatedrop` page, SW redesign, bake splat orientation | UI_NAV, UNIFIED_SLATE_PLAYER §, OFFLINE (SW) |
| **1 — Spine + entitlements** | project spine + "General" project + Start-Walk sheet; consolidate entitlements + token ledger + dispatcher holds | PROJECT_SPINE, STORE_IAP §5 |
| **2 — Offline + capture trust** | Dexie/Filesystem queue + multipart resume + sync UI; capture header Back/Exit | OFFLINE_CAPTURE, UI_NAV |
| **3 — Tokens + trial** | token wallet + pre-flight estimate gate + buy-more + trial caps; low-balance notify | TOKEN_UX, STORE_IAP §3-4 |
| **4 — Player + twin fix** | unified `SlatePlayer` + adapters; twin centering/orbit/walk | UNIFIED_SLATE_PLAYER, (J) |
| **5 — Reports** | block model → vertical+horizontal renderers + voice memos + comments; report editor; Puppeteer PDF | REPORT_BLOCK_SCHEMA, REPORT_EDITOR |
| **6 — Notifications + SlateDrop** | fan-out service + realtime bell + web push; SlateDrop copy + permission UI + intake + upload notify | NOTIFICATION_SERVICE, SLATEDROP_PERMISSIONS |
| **7 — Ghost + calendar** | ghost plan-pin (P1) + cloud VPR (P3); ICS subscribe feeds | GHOST_MODE, (M) |
| **8 — Store + IAP** | Capacitor builds + RevenueCat + SKUs + receipt webhook; review hardening | STORE_IAP_ENTITLEMENTS |
| **9 — Enterprise** | seats + permission matrix + oversight dashboards + org token pool | ENTERPRISE_CONSOLE |
| **ongoing** | amber→Graphite rebrand; CI design/route guards; tsc subsystem checks | UI_NAV |

## 6. What I'd need from you to keep moving
- Final **pricing + token-cost numbers** (or approval to ship with the illustrative config as placeholders).
- The **launch-monetization decision** (§4).
- Green light to **start building Phase 0** (or to keep refining any spec first).
