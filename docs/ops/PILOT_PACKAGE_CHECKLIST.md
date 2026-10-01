# Contractor pilot: minimum package checklist (DRAFT for Brian + Scout)

The first contractor pilot runs on the **token client portal** (`/portal/<token>`): light, packaged deliverables, no client login. It is not vNext (#39, the authenticated Explore/portfolio track).

Which deliverables a client paid for, how the portal hides the rest, and the ids still to build: `docs/design/CLIENT_PORTAL_DELIVERABLE_MATRIX.md`.

Client words used everywhere: **3D Scan · 360 / Walkthrough · 360 photos · Plans · Documents · Items · Site visit**.

**Prerequisite (once):**
- Merge #40 → #41 → #42 → #43 → #44 → #45 → #46 → #47 → #48 (→ L3).
- Turn on `spatial_directed_tour` for the Slate360 org (ask Claude; it's one setting).
- Until then, none of these screens exist on slate360.ai.

## Per pilot project

| # | Step | Where | Done when |
|---|---|---|---|
| 1 | **Project** exists | Projects → New project | Project page opens |
| 2 | **Enable what was sold** | Project → Overview → **Client portal** panel | Only sold rows are checked. Each shows Ready or Waiting. **Unchecked = invisible to the client:** no tab, no tile, no locked teaser. A checked row that is Waiting shows a one-line waiting state once that matrix behavior ships; it does not open a blank page. |
| 3 | **Upload the site visit** | Project → Spatial Walkthroughs → **+ New Walkthrough** → studio **Capture**: upload a stitched 2:1 360 MP4 | Clip shows Ready |
| 4 | **Privacy: framing first** | Studio → **Privacy**: keep the mask tight (behind and under the camera only), then Save. Saving builds the operator-free version. | Saved without "This mask would black out…". The poster shows no black band. |
| 5 | **Documents and items** (if sold) | Studio → **Pins**: add the item or document at its spot, visibility *Client* | Contracts, invoices and proposals stay *Internal* unless deliberately shared |
| 6 | **Preview as the client** | Client portal panel → **Preview as client** (30-minute link with an operator banner) | Light pages; site-visit date in the header; **one** "Open walkthrough"; only sold sections; no blank or dark areas |
| 7 | **Share the link** | Studio → **Publish** → Publish secure share (client; optional password and expiry) | The dialog shows the **Client portal link** (`/portal/<token>`) with **Copy link**. Send that link as is; no hand-editing. Older `/w/<token>` links still open the walkthrough. |
| 8 | **Check revoke** | Studio → Publish → Revoke on that share | The client link shows "Content unavailable" |

## Directed Tour (Stage 2: not in the first pilot)
The client Tour viewer (C2) ships after L3 **and** two real published visits on one route. When it's time:
1. Spatial Walkthroughs → **Directed Tour** → create the route from visit 1.
2. Set the **Published view**, then add checkpoints by scrubbing.
3. Print the **Capture card** and shoot visit 2 on the same route with the field steps.
4. Upload and privacy-bake visit 2 (steps 3–4 above), add it to the route, and mark every checkpoint.
5. Work the publish checklist until **Publish to client** appears, for both visits.
6. Check **Tour** in the Client portal panel. That tab only appears once C2 ships.

## What a client never sees
- Anything unchecked in step 2.
- Unpublished visits.
- Internal items and documents.
- The Tour setup page.
- Operator banners: preview links only.
- Masks inside the published view: blocked at publish.

## Known gaps before calling the pilot "ready"
- Older share pages (Site Walk deliverable `/view/`, file share `/share/`, upload and respond links, shared 3D scan) are light as of L5. Their media stages stay dark only behind a photo or video.
- **Scout craft audit** passes before `spatial_directed_tour` stays on.
