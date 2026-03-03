# Market Robot — Implementation Plan

## Purpose
Internal market intelligence and strategy workspace with signal tracking and action tooling.

## Current State
- Built route/module exists.
- Still needs decomposition and standards alignment.

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
