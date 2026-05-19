# Site Walk Component Feature Inventory

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Core Capture Components (Reuse Logic, Replace Chrome)

| Component | Feature | Real Behavior? | Reuse in V1? | Notes |
|---|---|---|---|---|
| CaptureContext.tsx | State management for items, pins, sheets, uploads | Yes (core) | Reuse logic | Do not rewrite state management |
| CaptureBottomSheet.tsx | Main capture bottom sheet | Yes | Replace chrome | Overlay/z-index debt |
| CaptureDataBottomSheet.tsx | Data entry sheet with Details/Attachments/Markup tabs | Yes | Replace chrome | Current V1 shell tabs should wrap this |
| CaptureItemForm.tsx | Item creation/edit form | Yes (core) | Reuse logic | Contains all field logic |
| CaptureItemListPanel.tsx | Captured items list | Yes | Reuse | |
| CameraViewfinder.tsx | Camera viewfinder overlay | Yes (core) | Reuse as-is | Camera hardware integration |
| PlanViewerLeaflet.tsx | Leaflet map for plan display | Yes (core) | Reuse as-is | DO NOT TOUCH plan loading |
| PlanViewerLeafletEvents.tsx | Event handlers for Leaflet | Yes (core) | Reuse as-is | Pin creation via long press |
| PlanViewerPdf.tsx | PDF-based plan viewer | Yes | Reuse as-is | Alternate to Leaflet |
| PlanPin.tsx | Pin component on plans | Yes | Reuse as-is | |
| PlanQuickActionMenu.tsx | Quick action menu on plan | UI only | Replace UI | No move/delete yet |
| PlanToolbar.tsx | Plan toolbar (compact pill) | UI only | Replace UI | Replace with V1 plan tools bar |
| PhotoMarkupCanvas.tsx | Markup annotation canvas | Yes | Reuse as-is | |
| PhotoMarkupControls.tsx | Markup tool controls | UI only | Replace UI | |
| PhotoAttachmentPins.tsx | Pin overlay on photo | Yes | Reuse | |
| LocationPickerModal.tsx | Location picker with map | Yes | Reuse | |
| ManageTradesModal.tsx | Trade tag management | Yes | Reuse | |
| SyncQueueIndicator.tsx | Offline sync status | Yes | Reuse | |
| VisualCaptureView.tsx | Photo capture view | Yes (core) | Reuse logic, replace chrome | |
| DataContextView.tsx | Weather/location/time display | Yes | Reuse | |
| UnifiedVectorToolbar.tsx | Vector drawing toolbar | UI | Replace UI | |
| CaptureQuickNotePanel.tsx | Quick note entry | Yes | Reuse | |
| CaptureSheetUtilityPanel.tsx | Sheet utility tools | UI | Replace UI | |
| DualModeToggle.tsx | Plan/Data toggle | UI | May replace | |
| PendingUploadPreviewModal.tsx | Upload preview modal | UI | Reuse | |
| CaptureUploadBadge.tsx | Upload progress badge | UI | Reuse | |

## Site Walk Shell Components (Replace UI)

| Component | Feature | Reuse? | Notes |
|---|---|---|---|
| SiteWalkShell.tsx | Module shell wrapper | Replace with V1Shell | Old pill-heavy chrome |
| SiteWalkModuleNav.tsx | Module navigation | Replace with V1BottomNav | Old tab structure |
| SiteWalkNav.tsx | Navigation bar | Replace | |
| LiveWalkShell.tsx | Live walk mode shell | Replace chrome | Keep viewport contract |

## Site Walk Feature Components (Reuse Logic)

| Component | Feature | Real Behavior? | Reuse? | Notes |
|---|---|---|---|---|
| SiteWalkSessionProvider.tsx | Session state context | Yes (core) | Reuse as-is | |
| SessionCaptureClient.tsx | Capture orchestrator | Yes (core) | Reuse logic | Main capture coordinator |
| SessionBoardClient.tsx | Kanban board view | Yes | Reuse | Leadership view |
| SessionReviewClient.tsx | Walk review | Yes | Reuse | |
| SessionListClient.tsx | Session list | Yes | Reuse logic, replace UI | |
| ProjectSelectorClient.tsx | Project selection | Yes | Reuse | |
| ProjectInbox.tsx | Project notifications | Yes | Reuse | |
| WalkItemsBrowse.tsx | Item browse/filter | Yes | Reuse | |
| CommentThread.tsx | Comment threads | Yes | Reuse | |
| AssignmentPanel.tsx | Assignment editing | Yes | Reuse | |
| TemplateManager.tsx | Checklist templates | Yes | Reuse | |
| ResolutionCapture.tsx | Resolution photo/note | Yes | Reuse | |
| DeliverableViewer.tsx | Deliverable rendering | Yes | Reuse | |
| BlockRenderer.tsx | Block content render | Yes | Reuse | |
| BlockEditor.tsx | Block content edit | Yes | Reuse | |
| PlanUploaderCard.tsx | Plan PDF upload | Yes | Reuse logic, replace UI | |

## SlateDrop Components (Keep As-Is)

| Component | Feature | Status |
|---|---|---|
| SlateDropClient.tsx | Main orchestrator | Production — keep |
| SlateDropSidebar.tsx | Folder tree sidebar | Production — keep |
| SlateDropToolbar.tsx | Action toolbar | Production — keep |
| SlateDropFileArea.tsx | File display area | Production — keep |
| SlateDropContextMenu.tsx | Right-click menu | Production — keep |
| SlateDropDesktopDropZone.tsx | Drag-and-drop | Production — keep |
| SlateDropActionModals.tsx | Action modals | Production — keep |
| SlateDropSharePreviewModals.tsx | Share preview | Production — keep |
| ProjectFileExplorer.tsx | Project file explorer | Production — keep |

## Dashboard/Shell Components (Keep As-Is)

| Component | Feature | Status |
|---|---|---|
| AppShell.tsx | Auth app shell | Production — keep |
| AuthedAppShell.tsx | Server auth wrapper | Production — keep |
| OperationsConsoleClient.tsx | Ops console | Production — keep admin-only |
| DashboardClient.tsx | Dashboard main | Production — keep |
| MobileBottomNav.tsx | Mobile bottom nav | Production — V1 has own nav |
| MobileTopBar.tsx | Mobile top bar | Production — V1 has own header |
| CommandPalette.tsx | Cmd+K palette | Production — keep |
| BetaFeedbackModal.tsx | Feedback form | Production — keep |
| InviteShareModal.tsx | Invite/share | Production — keep |

## V1 Preview Components (New — Not Yet Wired)

| Component | Purpose | Needs Wiring |
|---|---|---|
| SiteWalkV1Shell.tsx | V1 app shell | Wire to AuthedAppShell context |
| SiteWalkV1Header.tsx | V1 header with avatar menu | Wire to real user data |
| SiteWalkV1BottomNav.tsx | 5-tab nav | Wire to router |
| SiteWalkV1ActionGrid.tsx | Primary actions | Wire to real navigation |
| SiteWalkV1ListPanel.tsx | Work panel | Wire to real session data |
| WorksiteV1Row.tsx | Worksite row | Wire to real project data |
| WalkV1Row.tsx | Walk row | Wire to real session data |
| ReportV1Row.tsx (DeliverableV1Row) | Deliverable row | Wire to real deliverable data |
| PlanWorkspaceV1Skeleton.tsx | Plan workspace layout | Wire to real PlanViewerLeaflet |
| CaptureWorkspaceV1Skeleton.tsx | Capture workspace layout | Wire to real capture components |
