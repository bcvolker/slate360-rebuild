# Slate360 Context — File Index

**Last Updated:** 2026-03-02

This folder contains the project's living documentation — the "memory" passed between AI chat sessions. These files must stay current.

---

## Active Blueprint Files (One Per Topic)

| File | Topic | Keep Current |
|---|---|---|
| [DASHBOARD.md](DASHBOARD.md) | Dashboard layout, tabs, decomposition targets | ✅ |
| [PROJECT_HUB.md](PROJECT_HUB.md) | Project Hub 3-tier structure, tool views, CRUD | ✅ |
| [SLATEDROP.md](SLATEDROP.md) | SlateDrop file management, upload flow, folders | ✅ |
| [WIDGETS.md](WIDGETS.md) | Widget system, rendering rules, preferences | ✅ |
| [HOMEPAGE.md](HOMEPAGE.md) | Homepage layout, platform cards, pricing display | ✅ |
| [BACKEND.md](BACKEND.md) | Auth, billing, credits, email, DB tables, S3, CSP | ✅ |
| [FUTURE_MODULES.md](FUTURE_MODULES.md) | Unbuilt modules: Design Studio, CEO, Athlete360, etc. | ✅ |
| [GUARDRAILS.md](GUARDRAILS.md) | Code rules, refactoring priorities, tech debt tracker | ✅ |

## Reference Files (Update Rarely)

| File | Topic |
|---|---|
| [SUPABASE_EMAIL_TEMPLATES.md](SUPABASE_EMAIL_TEMPLATES.md) | Full HTML email templates for Supabase |
| [GPU_WORKER_DEPLOYMENT.md](GPU_WORKER_DEPLOYMENT.md) | GPU pipeline spec (not yet deployed) |

## Root-Level Project Files

| File | Purpose |
|---|---|
| `SLATE360_PROJECT_MEMORY.md` | **Master project memory** — attach to new chats |
| `PROJECT_RUNTIME_ISSUE_LEDGER.md` | Runtime bug tracker (Issues 1-10, all resolved) |
| `.github/copilot-instructions.md` | AI assistant auto-loaded instructions |

---

## Maintenance Rule

**Every code change that affects routes, components, APIs, DB tables, or feature behavior must include an update to the relevant blueprint file above.** The AI assistant should check after each change whether any context file needs updating.

---

## Archived Files (Superseded — Safe to Delete)

The following files have been consolidated into the active blueprints above and can be removed:

| Old File | Absorbed Into |
|---|---|
| `DASHBOARD_BLUEPRINT.md` | → `DASHBOARD.md` |
| `DASHBOARD_FEATURES.md` | → `DASHBOARD.md` |
| `PROJECT_HUB_BLUEPRINT.md` | → `PROJECT_HUB.md` |
| `PROJECT_HUB_AI_PREP_PROMPT.md` | → `PROJECT_HUB.md` |
| `SLATEDROP_BLUEPRINT.md` | → `SLATEDROP.md` |
| `SLATEDROP_FEATURES.md` | → `SLATEDROP.md` |
| `SLATEDROP_DIAGNOSTIC_PROMPT.md` | → `SLATEDROP.md` |
| `SLATEDROP_TABLE_MIGRATION.md` | → `SLATEDROP.md` |
| `HOMEPAGE_BLUEPRINT.md` | → `HOMEPAGE.md` |
| `REDESIGN_GUARDRAILS_AND_MODULE_MAP.md` | → `GUARDRAILS.md` |
| `REFACTOR_GUARDRAILS.md` | → `GUARDRAILS.md` |
| `SUBSCRIPTION_TIERS_AND_ENTITLEMENTS.md` | → `BACKEND.md` |
| `CREDIT_ROLLOVER_SYSTEM.md` | → `BACKEND.md` |
| `CREDIT_SYSTEM_PRICING_ANALYSIS.md` | → `BACKEND.md` |
| `10_SUPABASE_AWS_ACCESS_AND_PERMISSIONS.md` | → `BACKEND.md` |
| `auth-and-billing-spec.txt` | → `BACKEND.md` |
| `auth-ui-and-routes.txt` | → `BACKEND.md` |
| `backendinfra text file like auth-and-billing-spec.txt` | → `BACKEND.md` |
| `ceo3.txt` | → `FUTURE_MODULES.md` |
| `myaccount3.txt` | → `FUTURE_MODULES.md` |
| `athlete3603.txt` | → `FUTURE_MODULES.md` |
| `projecthub4.txt` | → `PROJECT_HUB.md` + `FUTURE_MODULES.md` |
| `AI_HANDOFF_BUNDLE_REVISED/` | → All active blueprints |
