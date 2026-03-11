# Dashboard Tabs — Context Files

This folder contains detailed specifications, blueprints, and reference material for each dashboard tab in Slate360.

## Purpose
Upload tab-specific documentation here to give Copilot full context when working on a particular module. Each file should describe the tab's purpose, UI structure, data model, API routes, and any relevant business rules.

## Canonical Sources (Read Order)
1. `SLATE360_PROJECT_MEMORY.md` — root startup context
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md` — startup and handoff rules
3. `slate360-context/dashboard-tabs/MODULE_REGISTRY.md` — canonical routes and gates
4. Only the active tab's docs
5. Uploaded raw artifacts (`*.txt`, `*.html`) — reference only, never default startup context

If two files conflict, prefer the higher item in this list.

## Token Rule

Do not read all tab folders in a new chat. Pull only the active tab.

For Market Robot, start with `market-robot/START_HERE.md` and use the longer Market docs only when needed.

## Current Tabs

| Tab | Folder | Canonical File |
|---|---|---|
| Dashboard Home | `dashboard-home/` | `IMPLEMENTATION_PLAN.md` |
| Project Hub | `project-hub/` | `IMPLEMENTATION_PLAN.md` |
| SlateDrop | `slatedrop/` | `IMPLEMENTATION_PLAN.md` |
| Design Studio | `design-studio/` | `IMPLEMENTATION_PLAN.md` |
| Content Studio | `content-studio/` | `IMPLEMENTATION_PLAN.md` |
| 360 Tour Builder | `tour-builder/` | `IMPLEMENTATION_PLAN.md` |
| Geospatial & Robotics | `geospatial-robotics/` | `IMPLEMENTATION_PLAN.md` |
| Virtual Studio | `virtual-studio/` | `IMPLEMENTATION_PLAN.md` |
| Analytics & Reports | `analytics-reports/` | `IMPLEMENTATION_PLAN.md` |
| My Account | `my-account/` | `IMPLEMENTATION_PLAN.md` |
| CEO Command Center | `ceo-command-center/` | `IMPLEMENTATION_PLAN.md` |
| Market Robot | `market-robot/` | `IMPLEMENTATION_PLAN.md` |
| Athlete360 | `athlete360/` | `IMPLEMENTATION_PLAN.md` |

## Naming Convention
One folder per tab, each containing:
- `IMPLEMENTATION_PLAN.md` (canonical)
- `raw-upload.*` files (supporting/archive sources when present)

Shared cross-tab contracts:
- `MODULE_REGISTRY.md`
- `CUSTOMIZATION_SYSTEM.md`

## Upload Rules (to prevent context loss)
- Keep raw uploads exactly as provided; do not edit in-place.
- Convert each meaningful upload into the tab's `IMPLEMENTATION_PLAN.md` and keep raw artifacts as source files in that same folder.
- Mark each source as one of: `canonical`, `supporting`, `archive-only`.
- Any route, access, or API decision from uploads must be reconciled with `DASHBOARD.md` and `FUTURE_FEATURES.md` in the same session.
- For future chats, always include a short “delta” section: what changed since last canonical spec update.
