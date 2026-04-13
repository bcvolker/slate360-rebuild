# Design Studio — Prompt Backlog

Last Updated: 2026-04-13

## Do Now (Safe, No Dependencies)

### DS-P1: Fix Page Gate
- Change page gate from `canAccessDesignStudio` to `canAccessStandaloneDesignStudio`
- Add `canAccessStandaloneDesignStudio` to entitlements resolver if missing
- **Why now:** P0 security gap — any trial user can access Design Studio pages

### DS-P2: Verify Model Upload E2E
- Test: upload GLB file → stored in S3 → viewable in 3D editor
- Document what works vs scaffolded
- **Why now:** Core feature verification before any new development

## After Gating Hardening

### DS-P3: Migrate API Routes to withAppAuth
- Check what auth wrapper DS API routes use
- Ensure they check `canAccessStandaloneDesignStudio`
- If using `withAuth()` only, migrate to `withAppAuth("design_studio")`

### DS-P4: Verify Coming Soon Blocking
- Ensure Stripe checkout is blocked for Design Studio
- "Join Waitlist" should not lead to payment

## After Billing Fully Unified

### DS-P5: Client Sharing Infrastructure
- Add shareable model links (similar to tour public viewer)
- Create share/external-link API routes
- Add to deliverable sharing system

### DS-P6: Expand Type Definitions
- Current types are 31 lines — insufficient for full model management
- Add types for annotations, versions, sharing

## Future / Roadmap

### DS-P7: Annotation and Markup Tools
- Add clickable annotations on 3D models
- Text, arrow, measurement annotations

### DS-P8: Version History
- Store model file versions
- Before/after comparison view

### DS-P9: Material/Texture Editing
- In-browser material swapping
- Texture upload and application
