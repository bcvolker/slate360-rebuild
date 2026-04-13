# SlateDrop — Prompt Backlog

Last Updated: 2026-04-13

## Do Now (Safe, No Dependencies)

### SD-P1: Extract ProjectFileExplorer
- `ProjectFileExplorer.tsx` at 363 lines — exceeds 300-line limit
- Extract into: `ProjectFileExplorerTree.tsx` + `ProjectFileExplorerActions.tsx` or similar
- **Why now:** Non-negotiable rule #1 violation

### SD-P2: Verify Storage Tracking
- Check if `lib/slatedrop/track-storage.ts` is actually called on upload
- Check if storage limits are enforced based on subscription tier
- Document the gap if not wired
- **Why now:** Storage is a billing dimension — if not tracked, can't enforce limits

### SD-P3: File Upload E2E Test
- Test: upload file → presigned URL → S3 PUT → complete callback → file visible
- Test with various file types and sizes
- **Why now:** Core feature verification

## After Gating Hardening

### SD-P4: Verify SlateDrop Auth
- SlateDrop is included with all tiers — verify auth wrappers are correct
- Should use `withAuth()` (not `withAppAuth`) since it's a platform feature
- Verify no subscription-specific gating needed

### SD-P5: Share Link Security Audit
- Check share link expiry settings
- Verify access tokens are properly scoped
- Test: create link → access as external user → revoke → verify blocked
- **Why now:** Secure send is a trust feature — must be airtight

## After Billing Fully Unified

### SD-P6: Storage Quota Enforcement
- Wire storage tracking into upload flow
- Show usage in billing tab
- Block uploads when over quota
- Offer storage addon upsell

### SD-P7: Notifications Overlay
- `SlateDropNotificationsOverlay.tsx` at 41 lines — scaffolded
- Implement real notification rendering
- Show: file shared with you, upload complete, link accessed

## After Dashboard Rewrite

### SD-P8: File Preview Enhancement
- In-app preview for: images, PDFs, videos
- `useSlateDropPreviewUrl.ts` exists — wire into UI
- Thumbnail generation for grid view

### SD-P9: Version History
- Track file versions on re-upload
- Show version timeline
- Restore previous versions

## Future / Roadmap

### SD-P10: Bulk Upload UI
- Upload progress bar for multiple files
- Drag-and-drop folder upload
- Resume interrupted uploads

### SD-P11: Advanced Permissions
- Per-folder/file access control
- View-only vs download vs edit
- Time-limited access

### SD-P12: Integration with Other Modules
- Site Walk: auto-sync captured photos to SlateDrop
- Design Studio: 3D model files in SlateDrop
- Content Studio: media assets linked to SlateDrop
