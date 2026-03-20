# Market Robot — Status Handoff

Created: 2026-03-20
Purpose: Cross-machine handoff for Market Robot UI redesign with Google Stitch

---

## Current Market Robot Tab State (as of Batch 4.6D)

### Layout
- **2-column workspace layout** (`grid grid-cols-12`) on `xl` (1280px+) screens:
  - Left (col-span-8): search, filters, market results
  - Right (col-span-4): sticky buy panel + saved markets
  - Mobile: full-width stacked
- Dark operator-console theme applied across most Market components

### What Works
- Direct-buy flow: search → select → buy (paper mode confirmed working)
- Esports filter: gaming titles excluded from Weather/Science views
- Category derivation: esports properly categorized instead of miscategorized
- Word-boundary synonym matching in search
- Post-buy success state with paper/live messaging in buy panel

### Known Issues (Red-Box Items)
1. **3 components still need dark theme**: `MarketLiveWalletTab.tsx`, `MarketCustomizeDrawer.tsx`, `MarketTradeReplayDrawer.tsx` — these are visually inconsistent with the rest of the dark operator console
2. **Live automation path incomplete**: scan execution is paper-only; live trading falls back silently
3. **Direct-buy can overstate live success** when backend falls back to paper mode
4. **Summary metrics partially legacy**: some metric sources not yet updated
5. **1000+ accumulated open paper trades** are not auto-resolved
6. **2-column layout only at xl breakpoint** (1280px+) — smaller desktops see stacked layout

### Key Files
| File | Lines | Purpose |
|---|---|---|
| `components/dashboard/market/MarketDirectBuyTab.tsx` | ~286 | 2-col buy workspace |
| `components/dashboard/market/MarketBuyPanel.tsx` | ~238 | Buy panel with inline/sidebar modes |
| `components/dashboard/market/MarketMarketsSection.tsx` | ~13 | Pass-through wrapper |
| `lib/market/search-synonyms.ts` | ~55 | Synonym matching + esports blocklist |
| `lib/market/direct-buy-table.ts` | ~122 | Buy table with esports exclusion |
| `lib/market/mappers.ts` | ~254 | Category derivation |
| `components/dashboard/MarketClient.tsx` | 2,800+ | Main Market client (monolith — read state + JSX together) |

---

## What the Rescue Rebuild Should Do

1. **Complete dark theme** on the 3 remaining components (MarketLiveWalletTab, MarketCustomizeDrawer, MarketTradeReplayDrawer)
2. **Fix live/paper truth surface** — UI must clearly indicate when a "live" trade actually fell back to paper
3. **Resolve stale paper positions** — auto-close or archive the 1000+ accumulated paper trades
4. **Responsive breakpoint improvement** — 2-column layout should activate earlier than 1280px
5. **Update summary metrics** to pull from current data sources instead of legacy
6. **Extract MarketClient.tsx** — the 2,800-line monolith needs to be broken into focused sub-components

---

## Google Stitch — Connected

Google Stitch (Gemini 2.5 Pro) has been added to the Continue.dev config in this Codespace:
- Appears as **"Google Stitch"** in the Continue chat model dropdown
- Provider: Gemini | Model: `gemini-2.5-pro`
- API key will be prompted by Continue on first use (not hardcoded)
- Has full project access — can see all files, components, and context docs in this workspace

To use: Open Continue panel → select "Google Stitch" from the model dropdown at bottom → paste Gemini API key when prompted → start prompting with screenshots or code references.

---

Ready for new chat on another computer in 1 hour – Google Stitch is now connected with full project access and can see screenshots.

**Phase 1 (Shared Customization Foundation) - COMPLETED**

- Updated `lib/market/layout-presets.ts` with new task-based tabs from IMPLEMENTATION_PLAN.md (Start Here, Direct Buy, Automation, Saved Markets, Results, Live Wallet)
- Fixed TS error in `MarketDashboardSection.tsx` (used correct `paperTrade` field)
- Made layout data-driven for easy global design/aesthetic changes across the project
- Typecheck now passes
- Committed and pushed successfully (after rebase)

**Completion Tracker**
- Phase 0: 100%
- Phase 1: 100%
- Estimated remaining focused prompts/sessions to have a complete and working Market Robot tab: **8-10**

**Things to Look for in the Build (Verification Checklist)**
1. `npx tsc --noEmit` → no errors
2. `npm run build` → succeeds
3. /market page loads without errors
4. DashboardHeader customize button opens drawer with the new tab names
5. Layout prefs persist on refresh
6. No console errors about 'paper' or missing tabs
7. The tab is still only visible to slate360ceo@gmail.com and granted users

Next Phase: Phase 2 — Create MarketPrimaryNav.tsx and update MarketClient.tsx / MarketStartHereTab

**Phase 2 Progress - Primary Nav + Tracker (Anti-Stall Batch Command)**

- Updated MarketPrimaryNav.tsx with the new task-based tabs from IMPLEMENTATION_PLAN.md
- Added design-friendly icons and data-driven structure for easy aesthetics and design changes across the project
- Typecheck passed

**Completion Tracker**
- Phase 0: 100%
- Phase 1: 100%
- Phase 2: 70%
- Remaining focused prompts/sessions to have a complete and working Market Robot tab: **7-9**

**Build Verification List**
1. npx tsc --noEmit (no errors)
2. npm run build (success)
3. /market page shows the new 6-tab navigation
4. Customize button works and uses new tabs
5. No console errors
6. Tab remains CEO-only or per-grant access

Next recommended: Phase 3 - MarketStartHereTab.tsx and update MarketClient.tsx

