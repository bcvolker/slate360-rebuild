# Market Robot — Full Revised Implementation Plan

## How To Use This File
This is the complete product specification for the Market Robot rebuild.
Before coding anything, also read (in order):
1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. `slate360-context/BACKEND.md`
4. `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md` ← build status, current batch, AI model guide, prompts

This file answers: **what to build and why.**
The tracker answers: **what batch is next, how many prompts, which AI to use, and what verification to run.**

## Slate360 Modularity — Why Market Is Safe To Rebuild
Market Robot is fully isolated within the Slate360 platform. Rebuilding it cannot break other tabs because:
- `MarketClient.tsx` has **zero external callers** outside `app/market/page.tsx` (GitNexus confirmed)
- All 18 API routes under `app/api/market/` are only called from Market UI code
- The 4 domain hooks (`useMarketBot`, `useMarketTradeData`, `useMarketsExplorer`, `useMarketDirectives`) are only imported inside the market component tree
- `app/market/page.tsx` is the only entrypoint — a standalone server gate that Dashboard, Project Hub, and SlateDrop never import
- The shared platform infrastructure Market uses (auth helpers, response helpers, Supabase clients, DashboardHeader, QuickNav) remains unchanged by any Market rebuild

This means: **any Market file can be replaced, any tab can be rebuilt, and any hook can be extracted without a blast radius beyond the market module itself.** The guaranteed safe order is always: build new surface → verify → retire old surface.

## Purpose

Turn /market into a beginner-friendly but powerful autonomous trading workspace that supports:

clear manual direct buys,

easy-to-start automation,

realistic practice testing,

safe real-money readiness,

saved/reusable plans and searches,

and true background operation that continues when the browser is closed.

This plan keeps the current design direction—task-based IA, plain-English terminology, shared customization, and no new monoliths—but adds the missing execution, simulation, profit, and always-on autonomy layers. The current plan already replaced implementation-heavy tabs with user-task tabs and split Results from Live Wallet, which remains the right foundation.

Canonical Constraints

Route remains /market. 

IMPLEMENTATION_PLAN

Access remains scoped internal access via `canAccessMarket`. Never re-gate by subscription tier entitlement during this refactor. 

IMPLEMENTATION_PLAN

app/market/page.tsx remains the gate + provider wrapper. 

IMPLEMENTATION_PLAN

components/dashboard/MarketClient.tsx remains a thin orchestrator, not a new all-in-one file.

Reuse shared dashboard header/customization patterns; do not fork a market-only customization system. 

IMPLEMENTATION_PLAN

Keep existing route/API contracts backward compatible where possible. 

IMPLEMENTATION_PLAN

New **production code files** (`.ts`/`.tsx`) should stay under 300 lines. Context and planning documents are exempt.

All bot-brain logic must be UI-agnostic and testable.

Any locking, idempotency, or execution protections must be additive and reversible.

Keep the repo’s auth and route helper patterns unchanged when implementing new/updated routes.

Product Goals
Primary goals

A new user can understand the tab in under 15–30 seconds.

Automation can be started without understanding every setting.

Every trade clearly explains wallet impact, implied probability, max loss, and potential payout.

Practice mode is realistic enough to test whether a plan survives slippage and imperfect fills.

The robot can run safely in the background with the browser closed.

Settings, searches, plans, and layouts can be saved and reused.

Secondary goals

Mobile-safe and job-site friendly.

Strong enough for advanced users without overwhelming beginners.

Clear enough for non-traders who still want to follow robot recommendations.

Easy to continue across new chats and future implementation passes.

New Top-Level IA

Keep the task-based IA, but strengthen the content and workflows inside each tab.

Tab	Purpose
Start Here	Learn what the tool does, choose practice vs real money, review robot recommendations, launch guided setup
Direct Buy	Search markets, inspect a trade, understand wallet/probability impact, and place a manual order
Automation	Start the robot using recommendations, presets, or advanced settings; save and reuse plans
Saved Markets	Unified saved markets, saved searches, alerts, and reusable views
Results	Portfolio, P/L, plan-by-plan analytics, activity log, trade replay, and test/simulation comparison
Live Wallet	Connect, verify, approve, check gas/readiness, run live setup verification, and understand blockers

This preserves the current plan’s task-based structure, which was already the right move.

Core UX Model: 3 Levels of Use

The robot must support three clear ways to use it:

1. Recommended

For users who want the app to choose for them.
Examples:

Best for a $200 wallet

Safer starter setup

Good for hands-off scanning

Good for short markets

Practice first

2. Guided

For users who want simple, plain-English controls.
Examples:

budget,

risk level,

max daily loss,

categories,

scan intensity,

max trades/day,

practice vs real money.

3. Advanced

For users who want complete control.
Examples:

slippage,

limit orders,

fill policy,

minimum liquidity,

maximum spread,

exposure caps,

large-trader signal weighting,

exit rules,

saved-search targeting,

websocket-driven triggers.

This matches the broader Slate360 direction toward help beacons, steppers, command-like shortcuts, and shared reusable flows. Similar patterns already appear across Project Hub and other tab docs.

Start Here tab

The first screen must still answer the current plan’s core questions—what can I do here, should I use practice mode or real money, and do I want direct buy or automation—but now it also needs to answer whether the user should trust the robot recommendation path. 

IMPLEMENTATION_PLAN

MarketStartHereTab.tsx must include

What this tool does

Practice mode vs real-money mode explainer

“Use robot recommendation” path

“Guided setup” path

“Advanced setup” path

What a YES/NO buy means

Live wallet setup checklist entry point

Recent results snapshot

Current automation status snapshot

Quick actions:

Find trade ideas now

Start practice automation

Verify live setup

Open saved plans

First-run wizard

Stepper:

Choose Practice or Real Money

Choose Recommended, Guided, or Advanced

Enter starting balance / wallet amount

Choose risk comfort

Review plan summary

Save and start or save for later

Live setup card

A big plain-English card:

Install/connect wallet

Add Polygon

Fund USDC

Verify signature

Approve spending

Run tiny live test

This mirrors the stepper/process-heavy guidance found elsewhere in Slate360’s tab planning.

Robot recommendations

This is now a first-class system, not just a helpful note.

Recommendation engine must support

Best for small wallet

Safer practice setup

Hands-off automation

Short-market scanner

Construction/weather/economy focus

Higher-risk aggressive setup

Live-ready starter plan

Every recommendation must show

why it was suggested,

suggested trade size,

suggested max positions,

suggested max daily loss,

suggested max trades/day,

suggested scan mode,

suggested categories,

whether practice or real-money mode is recommended,

expected activity level,

and a plain-English “what this will do” summary.

Recommendation actions

Apply

Apply and edit

Save as my template

Compare to another recommendation

Run in practice mode

Clone into advanced mode

Direct Buy tab

The current plan already made Direct Buy the manual trading path and already called for typed filters and a clearer buy panel.
Now it needs to become more execution-aware and easier to understand.

MarketDirectBuyTab.tsx must include

searchable/sortable market grid

visible quick filters

expandable advanced filters

clickable rows

quick-save market action

one-click buy drawer launch

trade ideas subsection

optional mobile card mode

Required columns

market title

category

YES price

NO price

implied probability

24h volume

liquidity

spread %

time to resolution

pricing edge / score

movement / momentum indicator

saved/tracked state

Required default filters and sort

default sort by pricing edge / score

quick buttons:

Ends next hour

Ends today

Ends this week

High liquidity

Tight spread

Fast-moving

Construction / Weather / Economy

Saved search

Advanced filters

category

price range

probability range

minimum liquidity

maximum spread

minimum volume

time to resolution

has large-trader activity

watchlist-only / saved-only

strict fill friendly only

Row click behavior

Clicking a row opens a detail modal or side drawer that shows:

market summary,

why this matched,

current prices,

mini price history,

top order-book levels,

volatility/momentum hint,

and the buy panel.

Buy panel: what a buy means

This is one of the most important additions.

MarketBuyPanel.tsx must show

YES / NO

entered amount

price

estimated shares

max loss

max payout

implied probability

break-even interpretation in plain English

what happens if price moves +5%, +10%, -5%, -10%

spread warning

liquidity warning

practice vs real-money badge

fill mode

slippage cap

order type

why the robot likes or dislikes the setup

Required controls

quick-fill buttons: $5 / $10 / $25 / $50 / custom

quick-fill % buttons: 10% / 25% / 50% / max

limit order toggle

marketable order option

max slippage setting

fill policy:

fill-or-kill

partial-fill allowed

cancel remainder

save market

add alert

send to automation plan

Partial-fill handling

The backend and UI must support partial fills explicitly:

show filled amount,

show remaining amount,

allow cancel remainder,

or allow rest-on-book behavior depending on order mode.

Practice mode realism

The previous revised plan added realistic fills; that stays, but it now needs explicit testing tools.

Practice mode must support

configurable starting balance

realistic fills

ideal fills

simulated slippage

fee-aware results

strict fill mode

shadow mode

paper-only mode

compare live-safe recommendation vs custom plan

save simulation result

New simulation tools

Run Test Simulation

Test this plan for a fake week

Test this plan for a fake month

Compare two plans side by side

Save simulation snapshot

Replay why the bot would have traded

Results labeling

Every simulation and paper result must clearly show whether it used:

realistic fills,

ideal fills,

fee model on/off,

partial-fill model,

strict or permissive fill assumptions.

Without this, practice mode is misleading.

Automation tab

The current plan already moved directives and bot config into one plain-English workflow.
Now it needs to become easy for beginners and rigorous enough for execution safety.

MarketAutomationTab.tsx must include

recommendation launcher

guided builder

advanced builder

saved plans list

active plan summary

safety summary card

activity log

kill switch

simulation launch

plan template tools

MarketAutomationBuilder.tsx must support
Basic controls

wallet budget

trade size style

risk level

categories

scan mode

max trades/day

practice vs real-money

max daily loss

max open positions

Intermediate controls

scan intensity

max % per trade

max % per market

max % per category

fee alert threshold

cooldown after loss streak

min gas reserve

saved search target

large-trader signals on/off

closing-soon focus on/off

Advanced controls

limit-order behavior

slippage

minimum liquidity

maximum spread

fill policy

websocket-trigger preference

event-driven rescan mode

exit rules

partial-fill behavior

per-strategy weighting

Automation summary card

Before starting, the user must see:

scans every X sec/min

max trades/day

max open positions

estimated trade size

max daily spend

max daily loss

categories watched

fill behavior

practice vs real-money

whether fee alerts are active

whether live setup is fully green

Plan actions

Save

Save As

Clone

Rename

Archive

Restore

Set as Default

Export JSON

Import JSON

Reuse last good plan

Autonomous execution architecture

The earlier plan mentioned background automation but did not make always-on scanning explicit enough. That is now a hard requirement.

Required autonomous architecture

Vercel cron or equivalent scheduler calls /api/market/scheduler/tick

cron cadence supports 30–60 second base ticking when safe

browser can be closed

global lock prevents overlapping ticks

per-user lock prevents duplicate execution

per-market lock prevents repeated overlapping intents

trade idempotency prevents duplicate inserts/orders

backpressure/queueing prevents runaway bursts

safe degradation modes exist

Degradation ladder

live execute

practice only

scan only

saved markets / alerts only

read-only safe mode

Scanner modes

Slow discovery

Balanced

Fast

Closing soon

Saved-search driven

Large-trader triggered

High-speed markets

Construction / Weather / Economy focused

Event sources

Execution should support both:

polling for broad discovery

websocket/event-driven updates for faster reactions

This should be built into the architecture so the engine is not REST-only.

Profit and volume controls

You asked for the ability to make high volumes of buys when it makes sense. That requires explicit safety and cost controls.

Required profit/volume controls

max trades/day

max trades/min

max concurrent order attempts

fee alert threshold

fee log in activity log

expected fee vs expected edge warning

skip trade if fees/slippage overwhelm expected value

safe throttle mode

burst mode for specific short-market plans

category concentration caps

New built-in strategy modes

These must be optional and clearly labeled, not hidden:

arbitrage-style detection

spread farming

short-market speed mode

large-trader follow mode

construction/weather/economy focus

balanced diversified mode

These should be selectable in recommendations and advanced automation, with plain-English explanations.

Risk Manager

This remains first-class.

risk-manager.ts must support

max daily loss

max weekly loss

max drawdown

max % per trade

max % per market

max % per category

max open positions

cooldown after loss streak

minimum gas reserve

fee threshold checks

degraded network halt

emergency stop state

live blocker state

Kill switch

A prominent Halt All Trading control must exist in Automation and remain reachable from the main market shell.

Exit logic

The robot must support exits, not just entries.

Required exit features

take-profit

stop-loss

time stop

stale-position cleanup

partial exit

full exit

manual exit from Results

auto exit rules in Automation

exit reason logging

replay of why exit occurred

Saved and reusable objects

The earlier plan already called for more reusable settings. Keep that and expand it.

Saveable objects

automation plans

recommendation-derived plans

plan templates

saved searches

filter presets

buy presets

risk profiles

layout presets

simulation snapshots

Required actions

Save

Save As

Clone

Rename

Archive

Restore

Set as Default

Export JSON

Import JSON

This aligns with the shared customization and persistence direction already present in the current plan. 

IMPLEMENTATION_PLAN

Saved Markets tab

The current plan correctly unified bookmark/watchlist into one concept.
Now expand it.

MarketSavedTab.tsx sections

Saved Markets

Saved Searches

Saved Plans

Recently Viewed

Alerts

Resume Last Session

This makes it easier to continue work across refreshes and future chats.

Results tab

The current plan already made Results its own top-level task. 

IMPLEMENTATION_PLAN


Now it should become a decision-quality analytics and replay screen.

MarketResultsTab.tsx must include

realized P/L

unrealized P/L

fee-adjusted P/L

expectancy per trade

profit factor

win rate

average hold time

P/L by category

P/L by plan

P/L by recommendation type

paper vs live comparison

simulation comparisons

activity log

skipped opportunities log

trade reasoning / replay drawer

exit reason history

Replay / reasoning view

For each trade or skipped candidate, show:

why it matched,

why it was chosen,

what constraints passed,

what constraints blocked others,

what exit happened,

and which plan/recommendation made the decision.

Live Wallet tab

The current plan already split wallet readiness from performance, which stays correct.

MarketLiveWalletTab.tsx must include

wallet connect

signature verification

allowance/approve status

balance summary

gas reserve status

network / RPC health

websocket connection health

live blockers summary

verify setup button

tiny live test flow

plain-English explanation of what is missing

Live mode cannot start unless all required readiness checks are green

wallet connected

signature verified

approval complete

gas reserve sufficient

correct network

credentials present

risk limits configured

emergency stop configured

live disclaimer acknowledged

Help, command palette, and mobile polish

Project Hub and other Slate360 planning docs already lean on command/search actions, tooltips, steppers, and process modals. 

projecthub


Market Robot should do the same.

Add command palette actions

Find trade ideas now

Start practice mode

Start automation

Pause automation

Halt all trading

Open saved plans

Open saved searches

Verify live setup

Run test simulation

Add help beacons

What does YES/NO mean?

What is implied probability?

What is max loss?

What is slippage?

What is liquidity?

Why did the robot recommend this?

Mobile requirements

large touch targets

swipeable idea cards in mobile mode

sticky action bar for buy / save / start automation

compact summary cards

no cramped tables as the only mode

Revised component architecture
Keep and repurpose

components/dashboard/MarketClient.tsx

components/dashboard/market/MarketBuyPanel.tsx

components/dashboard/market/MarketActivityLog.tsx

components/dashboard/market/MarketWalletCard.tsx

components/dashboard/market/MarketDirectivesList.tsx

lib/hooks/useMarketTradeData.ts

lib/hooks/useMarketBot.ts

lib/hooks/useMarketsExplorer.ts

lib/hooks/useMarketDirectives.ts 

IMPLEMENTATION_PLAN

New UI files

components/dashboard/market/MarketPrimaryNav.tsx

components/dashboard/market/MarketStartHereTab.tsx

components/dashboard/market/MarketRecommendationCard.tsx

components/dashboard/market/MarketGuidedSetupStepper.tsx

components/dashboard/market/MarketDirectBuyTab.tsx

components/dashboard/market/MarketSearchToolbar.tsx

components/dashboard/market/MarketAdvancedFiltersDrawer.tsx

components/dashboard/market/MarketTradeImpactCard.tsx

components/dashboard/market/MarketOrderBookPreview.tsx

components/dashboard/market/MarketAutomationTab.tsx

components/dashboard/market/MarketAutomationBuilder.tsx

components/dashboard/market/MarketPlanSummaryCard.tsx

components/dashboard/market/MarketRiskSummaryCard.tsx

components/dashboard/market/MarketKillSwitch.tsx

components/dashboard/market/MarketSavedTab.tsx

components/dashboard/market/MarketSavedSearchesPanel.tsx

components/dashboard/market/MarketResultsTab.tsx

components/dashboard/market/MarketReplayDrawer.tsx

components/dashboard/market/MarketLiveWalletTab.tsx

New hooks/state

lib/hooks/useMarketRecommendations.ts

lib/hooks/useMarketSavedSearches.ts

lib/hooks/useMarketPlanTemplates.ts

lib/hooks/useMarketReadiness.ts

lib/hooks/useMarketExecutionStatus.ts

lib/hooks/useMarketSimulations.ts

New backend/core files

lib/market/risk-manager.ts

lib/market/execution-engine.ts

lib/market/order-state-machine.ts

lib/market/profit-model.ts

lib/market/fill-simulator.ts

lib/market/opportunity-ranker.ts

lib/market/recommendation-engine.ts

lib/market/fee-estimator.ts

lib/market/websocket-engine.ts

lib/market/scan-orchestrator.ts

Revised PR order
PR1 — Shared customization foundation

Keep from current plan. Market must still use the shared header customize entry and shared layout preference model. 

IMPLEMENTATION_PLAN

Outcome:

market layout prefs work through shared header

market-specific layout presets exist

no market-only customize drawer fork

PR2 — New IA shell + Start Here + recommendations

Build:

MarketPrimaryNav.tsx

MarketStartHereTab.tsx

MarketRecommendationCard.tsx

MarketGuidedSetupStepper.tsx

Outcome:

users can choose Recommended, Guided, or Advanced

first-run path is clear

live setup entry point is visible

PR3 — Execution core + simulation + websocket foundation

Build:

risk-manager.ts

execution-engine.ts

order-state-machine.ts

profit-model.ts

fill-simulator.ts

fee-estimator.ts

websocket-engine.ts

scan-orchestrator.ts

Outcome:

safe execution foundation exists

realistic paper/test logic exists

partial-fill handling exists

websocket-aware architecture exists

PR4 — Direct Buy rebuild

Build/refactor:

MarketDirectBuyTab.tsx

MarketSearchToolbar.tsx

MarketAdvancedFiltersDrawer.tsx

MarketTradeImpactCard.tsx

MarketOrderBookPreview.tsx

MarketBuyPanel.tsx

useMarketsExplorer.ts

Outcome:

direct buys are understandable

wallet/probability impact is explicit

filters are profit-aware

sortable grid and mobile mode exist

PR5 — Automation rebuild + always-on operation controls

Build/refactor:

MarketAutomationTab.tsx

MarketAutomationBuilder.tsx

MarketPlanSummaryCard.tsx

MarketRiskSummaryCard.tsx

MarketKillSwitch.tsx

useMarketDirectives.ts

useMarketRecommendations.ts

Outcome:

plans can be built from recommendations

safety and trade-volume controls are visible

max trades/day, fee alerts, scan intensity, and kill switch exist

automation is understandable before starting

PR6 — Saved Markets + saved searches + reusable presets

Build:

MarketSavedTab.tsx

MarketSavedSearchesPanel.tsx

useMarketSavedSearches.ts

useMarketPlanTemplates.ts

simulation snapshot persistence

Outcome:

user can save and resume searches, plans, and workflows

PR7 — Results + replay + Live Wallet

Build/refactor:

MarketResultsTab.tsx

MarketReplayDrawer.tsx

MarketLiveWalletTab.tsx

MarketWalletCard.tsx

useMarketReadiness.ts

useMarketExecutionStatus.ts

Outcome:

results explain profitability and behavior

live readiness is blocker-driven

tiny live test path exists

PR8 — Cleanup, advanced tools, and observability

Fold or demote:

trade ideas / hot opps subsections

large-trader signals subsection

simulation compare subsection

scheduler/health and observability surfaces

finalize copy/help/tooltips/command palette actions

Outcome:

advanced tools remain available

IA stays clean

observability is visible without overwhelming beginners

Definition of Done

A new user can understand Market Robot in under 15–30 seconds. 

IMPLEMENTATION_PLAN

Users can start automation from a recommendation, not only from advanced settings.

Every buy clearly explains wallet impact, implied probability, max loss, and payout.

Practice mode supports realistic testing and test simulations.

Plans, searches, templates, and simulation results can be saved and reused.

Background automation can continue with the browser closed.

Partial fills, websocket-aware execution, and fee-aware warnings are supported.

Kill switch is always reachable.

Live Wallet clearly blocks unsafe live mode.

No new monolith file is introduced. 

IMPLEMENTATION_PLAN

Manual verification checklist

After each PR verify:

/market still gates on `canAccessMarket` only. 

IMPLEMENTATION_PLAN

Shared dashboard customization still controls market layout. 

IMPLEMENTATION_PLAN

Practice mode direct buy still works. 

IMPLEMENTATION_PLAN

Recommendation flow can launch practice automation without advanced settings.

Trade impact card shows correct max loss, payout, shares, and implied probability.

Saved markets persist across refresh. 

IMPLEMENTATION_PLAN

Saved searches, templates, and simulation snapshots persist.

Real-money readiness still shows connect, verify, approve, gas, and blocker states.

Tiny live test path stays blocked until readiness is green.

Kill switch halts automation immediately.

Partial-fill behavior is handled correctly in both UI and state.

Paper mode can switch between ideal and realistic fills.

npx tsc --noEmit passes. 

IMPLEMENTATION_PLAN

Existing route/API contracts remain backward compatible.

## Starting A New Chat

The persistent build file already exists at:
`slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`

It contains:
- current build status and active batch
- AI model recommendations per batch (Sonnet vs Opus)
- anti-hallucination protocol
- batch prompts with exact wording
- done-when verification gates per batch
- checks before every push
- rebuild-from-scratch blueprint
- default new-chat prompt (copy-paste ready)
- session log

To resume in a new chat, copy the **Default New-Chat Prompt** from the tracker.
Do not re-paste this entire implementation plan — the tracker's default prompt instructs the AI to read both files and orient before acting.
