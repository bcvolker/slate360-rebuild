# Slate360 — Project Memory

Last Updated: 2026-03-11
Repo: bcvolker/slate360-rebuild
Branch: main
Live: https://www.slate360.ai

This file is the default new-chat attachment. Keep it short. Read this first, then only pull the docs required for the task.

## Start Here

Recommended read order:
1. This file
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. Only task-relevant docs

Do not read all context files by default.

## Project Snapshot

Slate360 is a Next.js 15 + React 19 + TypeScript SaaS platform with:
- Supabase for auth and primary data
- AWS S3 for file storage
- Stripe for billing
- Vercel for hosting and cron
- Market Robot as an internal route at `/market`

Primary live modules:
- `/dashboard`
- `/project-hub`
- `/slatedrop`
- `/market`

Tier note:
- subscription tiers are `trial < creator < model < business < enterprise`
- subscription gates use `getEntitlements()`
- `/ceo`, `/market`, and `/athlete360` are internal access routes, not subscription features

## Critical Rules

1. No production `.ts` / `.tsx` / `.js` file over 300 lines.
2. No `any`.
3. Use shared auth wrappers and response helpers.
4. Types come from `lib/types/`.
5. Server components first.
6. Internal routes (`/ceo`, `/market`, `/athlete360`) do not use entitlements.
7. Subscription gates must use `getEntitlements()`.
8. New folder writes use `project_folders`.
9. No mock data in production UI.
10. Update context docs after code changes.

## Task-Based Read Map

| If you are working on | Read |
|---|---|
| Market Robot | `slate360-context/dashboard-tabs/market-robot/START_HERE.md` |
| Backend/auth/billing/storage | `slate360-context/BACKEND.md` |
| Shared dashboard/tab behavior | `slate360-context/DASHBOARD.md`, `slate360-context/dashboard-tabs/MODULE_REGISTRY.md`, `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md` |
| Project Hub | `slate360-context/PROJECT_HUB.md` |
| SlateDrop | `slate360-context/SLATEDROP.md` |
| Widgets | `slate360-context/WIDGETS.md` |
| Active bugs | `slate360-context/ONGOING_ISSUES.md`, `ops/bug-registry.json` |
| Release readiness | `ops/module-manifest.json`, `ops/release-gates.json` |

## Backend Quick Access

### Supabase
- URL: `https://hadnfcenpcfaeclczsmm.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm`
- Local secrets: `.env.local`
- Clients:

```typescript
import { createClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
```

### AWS S3
- Bucket: `slate360-storage`
- Region: `us-east-2`
- Client: `lib/s3.ts`

### Vercel
- Auto-deploy from `main`
- Cron source: `vercel.json`
- Stripe secrets live in Vercel envs

### Git
- Default branch: `main`
- Standard flow: local edit -> typecheck / verify -> commit -> push
- Do not assume unrelated dirty changes are yours

## Core Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run diag:market-runtime
npm run verify:release
bash scripts/check-file-size.sh
```

During build/release work, also run the relevant guards before pushing shared or backend changes.

## Market Robot Focus

Route and gate:
- Route: `/market`
- Gate: `resolveServerOrgContext().canAccessMarket`

Current reality:
- Paper-mode flow is partly working
- Live mode still needs real Polymarket credentials and spender config
- Background automation still depends on Vercel cron and scheduler health
- Runtime state is improved but not fully unified yet

Most important Market files:
- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx`
- `components/dashboard/market/`
- `lib/hooks/useMarket*`
- `lib/market/`
- `app/api/market/`

## Archive And Token Policy

Do not pull large history docs unless the task needs them. Default reference-only files:
- `slate360-context/dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `slate360-context/FUTURE_FEATURES.md`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
- `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`

Use those files only for deep history, roadmap, or recovery work.

## Known Monolith Files (read state + JSX together)

| File | Lines | Risk |
|---|---|---|
| `components/dashboard/DashboardClient.tsx` | 2,800+ | State at top, JSX at bottom — can't edit one without seeing the other |
| `components/slatedrop/SlateDropClient.tsx` | 2,030 | Multi-phase upload + preview logic |
| `components/project-hub/ClientPage.tsx` | 834 | Mutation + display interleaved |

When editing these, always read both the state declarations AND the JSX sections.

## Latest Session Handoff

<!-- Each chat MUST overwrite this section at end of conversation. Next chat reads this first. -->

### Session Handoff — 2026-03-19 (Dev Environment / Continue.dev)

#### What Changed
- **Dev environment only — no Slate360 code touched.**
- `~/.continue/config.yaml`: Added Grok 4.2 model entry for Continue.dev.
  - provider: `openai` (OpenAI-compatible), model: `grok-beta`, apiBase: `https://api.x.ai/v1`
  - API key reads from `$XAI_API_KEY` env var (not hardcoded). Backup at `~/.continue/config.yaml.bak`.
  - **On next login**: Set `XAI_API_KEY` as a Codespace secret, then select "Grok 4.2" from the Continue chat model dropdown (bottom of Continue panel).

#### What's Broken / Partially Done
- Continue.dev reload was cancelled this session — if Grok 4.2 doesn't appear in the dropdown on next login, run Command Palette → "Developer: Reload Window".
- `~/.continue/config.yaml` lives in Codespace user home and does NOT auto-persist to a brand-new machine. If spinning up a fresh Codespace, re-add the Grok 4.2 entry or copy from this handoff.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: Session handoff

#### Next Steps (ordered)
1. On next login: open Continue panel → click model selector at bottom → confirm "Grok 4.2" appears.
2. If missing: Command Palette → "Developer: Reload Window".
3. Resume Slate360 work from Batch 4.6D (see previous handoff below).
4. Next Slate360 batch: Batch 4.6B — dark theme for MarketLiveWalletTab, MarketCustomizeDrawer, MarketTradeReplayDrawer.

---

### Previous Session Handoff — 2026-03-18 (Batch 4.6D)

#### What Changed
- `components/dashboard/market/MarketDirectBuyTab.tsx`: Restructured into 2-column `grid grid-cols-12` workspace layout — search/filters/results on left (col-span-8), sticky buy panel + saved markets on right (col-span-4). Mobile remains stacked. (248→286 lines)
- `components/dashboard/market/MarketBuyPanel.tsx`: Added `inline` prop for sidebar rendering, `onOpenResults` callback. Prominent post-buy success state with explicit paper/live messaging and "Open Results → View Positions" action button. (225→238 lines)
- `components/dashboard/market/MarketMarketsSection.tsx`: Simplified to pass-through wrapper forwarding `onNavigate` prop. Removed separate saved-markets layout. (22→13 lines)
- `lib/market/search-synonyms.ts`: Added `ESPORTS_BLOCKLIST_RE` regex and `isEsportsTitle()` export for gaming title detection. (47→55 lines)
- `lib/market/direct-buy-table.ts`: Added esports exclusion filter for Weather/Science category views. (120→122 lines)
- `lib/market/mappers.ts`: Added esports guard in `deriveCategory()` — gaming titles now categorized as "Esports" instead of being miscategorized. (250→254 lines)

#### What's Broken / Partially Done
- 3 Market component files still need dark theme: MarketLiveWalletTab.tsx, MarketCustomizeDrawer.tsx, MarketTradeReplayDrawer.tsx (deferred to 4.6B)
- Market live automation path remains incomplete (scan execution is paper-only)
- Direct-buy UX can still overstate live success when backend falls back to paper
- Summary metric source remains partially legacy
- Accumulated open paper trades (1000+) are not auto-resolved
- The 2-column layout only kicks in at `xl` breakpoint (1280px+); smaller desktops see full-width stacked

#### Context Files Updated
- `docs/market-robot/MARKET_ROBOT_BUILD_FILE.md`: Batch 4.6D section added with full change log
- `docs/market-robot/MARKET_ROBOT_CHAT_RESUME_PROTOCOL.md`: Current batch and latest rescue state updated to 4.6D
- `docs/market-robot/MARKET_ROBOT_PROMPT_BACKLOG.md`: Batch 4.6D entry added
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`: 4.6D entry added
- `SLATE360_PROJECT_MEMORY.md`: Session handoff

#### Next Steps (ordered)
1. Run Batch 4.6B: CSS-only dark theme conversion of the 3 remaining files (MarketLiveWalletTab, MarketCustomizeDrawer, MarketTradeReplayDrawer)
2. Verify the 2-column layout in browser at xl breakpoint
3. Verify esports titles don't appear in Weather/Science filtered views
4. Verify "Open Results → View Positions" button works after successful paper buy
5. Then proceed to Batch 5 backend truth patch if still needed
4. Consider adding a bulk-resolve / auto-close path for accumulated old paper trades