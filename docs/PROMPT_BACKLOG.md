# Slate360 — Master Prompt Backlog Index

Last Updated: 2026-04-14
Doctrine Source: docs/SLATE360_MASTER_BUILD_PLAN.md

## Prompt Backlog Locations

| Area | File | Focus |
|------|------|-------|
| Platform | docs/platform/SLATE360_PLATFORM_PROMPT_BACKLOG.md | Shell, nav, beta gate, Operations Console, bug/feature reporting, collaborator flows, notifications |
| Billing | docs/billing/BILLING_PROMPT_BACKLOG.md | Checkout, entitlements, beta flag, TIER_MAP, collaborator seats |
| SlateDrop | docs/slatedrop/SLATEDROP_PROMPT_BACKLOG.md | File management, Site Walk integration, storage, collaborator file access |
| Site Walk | docs/site-walk/SITE_WALK_BUILD_FILE.md (verification section) | Capture, deliverables, sharing, offline, collaborator field access, metadata, status |

## Phase 1 Beta — Ordered Implementation Sequence

This is the canonical order. All prompt backlogs reference this phasing.

### Phase A — Pre-Design (code changes, no new UI design needed)
1. P-A1: Hide placeholder modules from nav (~30 min)
2. P-A2: Fix MobileNavSheet gate inconsistency (~15 min)
3. P-A3: Add beta access gate (OWNER DECISION NEEDED: invite code vs flag vs approval)
4. SD-A1 / P-A4: Wire Site Walk uploads to SlateDrop project folders (~2-4 hrs)
5. P-A5: Add unified bug/feature reporting form (~2-4 hrs)
6. P-A6: Rename "Organization" language to "Workspace" (~1 hr)
7. P-A7: Rebuild Operations Console (replace CeoCommandCenterClient mock data, add beta management, triage, collaborator/linking visibility)
8. B-A1: Verify Site Walk checkout E2E (~1-2 hrs)
9. B-A4: Add collaborator seat limit (maxCollaborators) to entitlements resolver
10. SD-A4: Add collaborator file access scoping to SlateDrop APIs

### Phase B — Owner Design Decisions (NO CODE until approved)
11. P-B1: Command center layout
12. P-B2: Site Walk capture UX
13. P-B3: Mobile navigation
14. P-B4: Project creation flow (wizard design)
15. P-B5: Beta onboarding flow (subscriber path)
16. P-B6: Collaborator invite/accept UX
17. P-B7: Collaborator scoped project view
18. P-B8: Subscriber-to-subscriber project linking UX
19. P-B9: Metadata + notification settings UX

### Phase C — Design Implementation (after owner approval)
20. P-C1: Command center
21. P-C2: Site Walk UI
22. P-C3: Beta onboarding
23. P-C4: Subscriber-to-subscriber project linking
24. P-C5: Collaborator invitation flow
25. P-C6: Collaborator scoped view
26. P-C7: In-app notification system
27. P-C8: Unified bug/feature reporting form
28. P-C9: Extract Project Hub monoliths

### Phase D — Beta Hardening
29. P-D1: E2E smoke tests
30. P-D2: Offline capture
31. P-D3: PDF export verification
32. P-D4: Email sharing verification
33. P-D5: E2E collaborator flow (invite → signup → scoped access → field work → notification)

## Owner Decisions Required Before Phase A Item 3

1. Beta gate mechanism: Invite code on signup? Beta flag in DB toggled by Operations Console? Approval queue?
2. Organization rename: "Workspace" or just hide the language?
3. Should beta testers pay or get free access?
4. Collaborator seat limits per tier: Recommended Standard=0, Pro=3 — owner confirm?
5. Collaborator capabilities: Can they create new items, or only respond to existing?
6. Operations Console scope: Confirm the Phase 1 capabilities list in master build plan Section 6
7. Project creation wizard: What fields for Phase 1?
8. Metadata defaults: Timestamp always on? Geolocation opt-in/out? Weather Phase 1 or 2?
9. Notification preferences: Which email notifications in Phase 1?
