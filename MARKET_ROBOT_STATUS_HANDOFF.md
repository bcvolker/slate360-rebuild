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
