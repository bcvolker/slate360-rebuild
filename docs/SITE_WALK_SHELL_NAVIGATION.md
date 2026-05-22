# Site Walk V1 Shell — Navigation Map

**Bottom nav order (left → right):** Home · Worksites · SlateDrop · Coordination · Deliverables

| Tab | View | Primary actions |
|-----|------|-----------------|
| **Home** | `HomeView` | Create Worksite → `/site-walk/setup`; Walk from Worksite → `/site-walk/walks`; Quick Walk → `buildCaptureLaunchUrl` (V2 when flag on) |
| **Worksites** | `WorksitesView` | New Worksite → `/site-walk/setup`; Start Walk per row → `/site-walk/setup` |
| **SlateDrop** | `SlateDropView` | Placeholder sections (mobile SlateDrop routes quarantined) |
| **Coordination** | `CoordinationView` | Placeholder sections (full inbox not built) |
| **Deliverables** | `DeliverablesView` | Placeholder (legacy `/site-walk/deliverables` redirects on mobile) |

## Walk entry paths

| Entry | Route |
|-------|--------|
| Quick Walk (home grid) | POST session → `buildCaptureLaunchUrl({ session, quick: 'camera' })` |
| Start Walk (setup form) | POST session → `buildCaptureLaunchUrl({ session })` |
| Resume (walks list / hub menu) | `buildWalkResumeUrl(id, status)` |
| Active walk card | `buildCaptureLaunchUrl({ session })` |
| Completed walk | `buildWalkResumeUrl` → review or V2 summary |

## Feature flag

Set `NEXT_PUBLIC_CAPTURE_V2=true` in `.env.local` to route capture/summary to `/site-walk/capture-v2`.

## App Store note

Hide or replace placeholder tabs before submission; do not show "Coming Soon" sheets on authenticated surfaces per `AGENTS.md`.
