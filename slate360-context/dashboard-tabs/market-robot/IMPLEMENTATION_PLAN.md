# Market Robot — Implementation Plan

## Purpose
Internal market intelligence and strategy workspace with signal tracking and action tooling.

## Current State
- `/market` route now uses shared dashboard chrome via `components/dashboard/market/MarketRouteShell.tsx` (same `DashboardHeader` + spacing system as other tabs).
- `MarketClient.tsx` no longer renders its own standalone logo/back-link header; route shell owns top chrome for consistency.

## Access Gate (Canonical)
- Gate by `hasInternalAccess`.
- Never gate through tier entitlements.

## MVP Scope
1. Reliable market feed + watchlists.
2. Signal interpretation and recommendation surface.
3. Action logging and operator workflows.
4. Interop into CEO reporting flows.

## Data Contracts
- `MarketSignal`, `WatchItem`, `MarketAction`, `PerformanceSnapshot`.

## API Plan
- Maintain existing market APIs; formalize action/audit endpoints.

## Customization Requirements
- Movable signal widgets.
- Expandable strategy panels.
- Saved watchlist and layout presets per user.

## Dependencies
- Existing market providers and secure key handling.

## Definition of Done
- Operators can monitor, decide, and track outcomes in one place.
- Custom layouts persist and reset cleanly.
