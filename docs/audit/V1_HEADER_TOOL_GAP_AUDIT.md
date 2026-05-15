# V1 Header Tool Gap Audit

Last Updated: 2026-05-15
Status: Read-only audit. No code changes.

## Purpose

Audits which header tools exist in production and whether the V1 header currently shows them.

## Feature Map

| Feature | Production Component | Production Route/API | V1 Header Shows? | Next Step |
|---|---|---|---|---|
| Global search | `CommandPalette.tsx` (Cmd+K) | Client-side search | No | Wire CommandPalette trigger to V1 header search icon |
| Notifications | `NotificationsMenu.tsx` (bell + dropdown) | Props-driven, no backend table | No | Add bell icon to V1 header; pass notification props from shell |
| Share/Invite | `InviteShareModal.tsx` + `InviteShareButton.tsx` | `/api/invites/generate`, `/api/projects/[id]/collaborators/invite` | No | Add share icon or put in overflow menu |
| Bug report | `BetaFeedbackModal.tsx` + `BetaFeedbackButton.tsx` | `/api/feedback` (POST) | No (in avatar menu as text) | Keep in avatar menu; optionally add header icon |
| Feature suggestion | — | `/api/suggest-feature` (POST) | No | Keep in avatar menu or feedback form |
| Avatar/profile menu | `MobileTopBar.tsx` avatar dropdown | Various settings/account routes | Yes — avatar menu with Account/Settings/Billing/Organization/Feedback/Help/Sign Out | Wire real user initial from server data (done) |
| Operations console | `OperationsConsoleClient.tsx` | `/operations-console`, `/api/admin/beta`, `/api/ceo/*` | No (correctly hidden from normal users) | Show only for canAccessOperationsConsole users; add to avatar menu conditionally |

## Current V1 Header Composition

The V1 header (`SiteWalkV1Header.tsx`) currently shows:
1. Back button (optional, subpages only)
2. SlateLogo (sm) + "Site Walk" subtitle (Home tab via `showBranding`) OR title text (subpages)
3. Primary action button (optional)
4. Overflow menu (optional)
5. Tool icon row: Search, Notifications, Share, Feedback (Home tab via `showToolIcons`) — **visible but not yet wired**
6. Avatar menu (always when `showAvatar=true`) — **functional**

## Missing from V1 Header

1. **Search icon** — should open CommandPalette on tap
2. **Notifications bell** — should show NotificationsMenu dropdown with badge count
3. **Operations Console link** — should appear in avatar menu only for owner/admin

## Recommended V1 Header Layout (Left to Right)

| Position | Element | Condition |
|---|---|---|
| Left | Back button | Only on subpages |
| Left | Title | Always |
| Right | Search icon | Always (opens CommandPalette) |
| Right | Bell icon + badge | Always (opens NotificationsMenu) |
| Right | Primary action button | Only when provided |
| Right | Avatar menu | Always |

## Implementation Notes

- `CommandPalette` is a client component using `cmdk` — can be triggered programmatically
- `NotificationsMenu` receives `HeaderNotification[]` as props — needs a data source (project_notifications or inline query)
- `BetaFeedbackModal` is self-contained — just needs a trigger button
- Operations Console link should check `isAdmin` prop before rendering in avatar menu
