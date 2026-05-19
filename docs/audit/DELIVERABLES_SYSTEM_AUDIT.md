# Deliverables System Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Maps the deliverables infrastructure. V1 must use "Deliverables," not "Reports."

## 22 Deliverable Types (Defined in Backend)

`report`, `punchlist`, `photo_log`, `rfi`, `estimate`, `status_report`, `proposal`, `field_report`, `inspection_package`, `safety_report`, `proof_of_work`, `client_portal`, `kanban_board`, `cinematic_presentation`, `spreadsheet_export`, `virtual_tour`, `tour_360`, `model_viewer`, `media_gallery`, `client_review`, `custom`

## Deliverable Statuses

`draft`, `in_review`, `approved`, `submitted`, `shared`, `published`, `archived`, `revoked`

## Output Modes

`hosted`, `pdf`, `portal`, `presentation`, `spreadsheet`, `zip`, `email_body`, `email_snapshot`, `interactive_link`

## Data Model

| Table | Purpose | Key Columns |
|---|---|---|
| `site_walk_deliverables` | Main deliverable record | `session_id`, `deliverable_type`, `status`, `content` (jsonb blocks), `share_token`, `output_mode`, `portal_config`, `kanban_config`, `viewer_config`, `allow_viewer_responses` |
| `site_walk_deliverable_blocks` | Block-editor rows | `deliverable_id`, `block_type`, `content`, `sort_order` |
| `site_walk_deliverable_assets` | Media assets | `deliverable_id`, `source_item_id`, `s3_key`, `asset_type` |
| `site_walk_deliverable_views` | View tracking | `deliverable_id`, `viewer_ip`, `viewed_at` |
| `site_walk_deliverable_snapshots` | Immutable history | `deliverable_id`, `snapshot_content` |
| `deliverable_access_tokens` | Token-gated public access | `token`, `deliverable_type`, `role`, `expires_at` |
| `viewer_comments` | Public comments | `deliverable_id`, `author_name`, `body`, `comment_intent` |

## API Routes

| Route | Methods | Purpose | Status |
|---|---|---|---|
| `/api/site-walk/deliverables` | GET, POST | List/create | Production |
| `/api/site-walk/deliverables/[id]` | GET, PATCH, DELETE | CRUD | Production |
| `/api/site-walk/deliverables/[id]/export` | POST | PDF generation | Production |
| `/api/site-walk/deliverables/[id]/share` | POST | Generate share link | Production |
| `/api/site-walk/deliverables/[id]/revoke` | POST | Revoke share | Production |
| `/api/site-walk/deliverables/[id]/snapshot` | POST, GET | History snapshots | Production |
| `/api/site-walk/deliverables/[id]/views` | GET | View analytics | Production |
| `/api/site-walk/deliverables/send` | POST | Email (3 modes) | Production |
| `/api/view/[token]/comments` | GET, POST | Public viewer comments | Production |
| `/api/view/[token]/media/[itemId]` | GET | Public media resolver | Production |

## PDF Export Logic

- Uses jsPDF (letter format)
- Renders org name, date, title, then iterates `EditorBlock[]` content
- Block types: heading, text, callout, divider, image (placeholder only)
- Uploads PDF to S3 `site-walk/exports/{orgId}/{id}.pdf`
- Bridges to SlateDrop Deliverables folder
- Org branding support (logo, signature, primary color)

## Share/Viewer Infrastructure

- Token: `crypto.randomBytes(24).toString("base64url")`
- Metadata on deliverable: `share_token`, `shared_at`, `share_expires_at`, `share_max_views`, `share_view_count`, `share_revoked`
- View tracking: `site_walk_deliverable_views` table
- Loading: `loadDeliverableByToken()` in `lib/site-walk/load-deliverable.ts`
- Send modes: link (URL), inline_images (first 12 photos), pdf_attachment
- Public viewer comments with `comment_intent`: approve, needs_change, question, comment

## Interactive Deliverable Support

The data model stores extensive interactive configs (`portal_config`, `presentation_config`, `kanban_config`, `viewer_config`, `response_config`, `navigation_config`). API CRUD is ready. **Frontend interactive viewers are NOT yet built.**

## Block Editor Support

- Block types: heading, text, image, divider, callout (defined in `lib/types/blocks.ts`)
- Content stored as `EditorBlock[]` JSON array
- `ReportBuilderClient` component exists but is a **static wireframe only** — no drag-drop, no block CRUD wired

## What Is Production-Ready vs Partial

| Capability | Status |
|---|---|
| Create/read/update/delete deliverables | Production |
| PDF export (basic) | Production |
| Share link generation/revocation | Production |
| View tracking | Production |
| Email send (3 modes) | Production |
| History snapshots | Production |
| Public viewer comments | Production |
| Block editor UI | Static wireframe only |
| Interactive viewers (portal, kanban, presentation) | Config stored, no renderer |
| Image embedding in PDF | Placeholder only |
| Rich media deliverables (360, 3D, video) | Type exists, no renderer |

## Recommended V1 Deliverable Categories

| V1 Category | Maps To Backend Type(s) |
|---|---|
| Visual Walk Summary | `report`, `photo_log` |
| Punch / Issue Package | `punchlist` |
| Proposal Package | `proposal`, `estimate` |
| Before & After | Uses `item_relationship` before/after |
| Progress Timeline | `status_report`, `proof_of_work` |
| Field Report | `field_report`, `inspection_package`, `safety_report` |
| Interactive Link | `client_portal`, `kanban_board`, `cinematic_presentation` |
| 360 Tour / 3D Model | `virtual_tour`, `tour_360`, `model_viewer` |
| Closeout Record | `client_review`, `custom` |
| PDF Export | Any type with `output_mode: 'pdf'` |
| Spreadsheet Export | `spreadsheet_export` |
