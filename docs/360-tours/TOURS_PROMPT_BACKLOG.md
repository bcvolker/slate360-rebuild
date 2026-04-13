# 360 Tours — Prompt Backlog

Last Updated: 2026-04-13

## Do Now (Safe, No Dependencies)

### T-P1: Tour CRUD E2E Verification
- Test: create tour → upload scene → view tour → edit → delete
- Verify API routes and DB writes work
- Document what works vs scaffolded
- **Why now:** Module is marked "active" but real testing status unclear

### T-P2: Public Tour Viewer Test
- Navigate to `/tours/view/[slug]` with a real tour
- Verify 360 panorama rendering
- Test on desktop and mobile browser
- **Why now:** Public sharing is a key feature — must work before launch

### T-P3: Verify Coming Soon Gate
- Confirm Tour Builder checkout is blocked (marketing says "Coming Soon")
- Ensure "Join Waitlist" CTA does not lead to a working checkout
- **Why now:** Prevents accidental revenue for unfinished product

## After Gating Hardening

### T-P4: Verify Tour Builder API Auth
- Check what auth wrapper tour API routes use
- Ensure they check `canAccessStandaloneTourBuilder`
- If using `withAuth()` only, migrate to `withAppAuth("tour_builder")`

### T-P5: Expand TourBuilderShell
- Current shell is 20 lines (scaffolded)
- Design the builder layout: scene list + editor + preview + settings
- Keep under 300-line limit

## After Billing Fully Unified

### T-P6: Scene Management Polish
- Test reorder, delete, upload-complete flows
- Verify S3 cleanup on scene deletion
- Add error handling for oversized files

### T-P7: Tour Settings Implementation
- `TourSettingsPanel.tsx` is 42 lines (likely scaffolded)
- Implement: privacy, branding, embed options

## After Site Walk Stabilized

### T-P8: Cross-Module Integration
- Link 360 scenes to Site Walk sessions
- Pin Site Walk items inside 360 panoramas
- This is the Field Pro Bundle value proposition

## Future / Roadmap

### T-P9: Hotspots and Annotations
- Interactive clickable areas within 360 scenes
- Rich content popups (text, images, links)

### T-P10: Analytics Dashboard
- View count per tour
- Average time spent
- Geographic distribution of viewers

### T-P11: Floor Plan Integration
- Upload floor plans
- Link scenes to floor plan locations
- Mini-map navigation
