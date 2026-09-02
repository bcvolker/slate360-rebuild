# Monday commercial proof — schema apply

Production project: `slate360-prod` / `hadnfcenpcfaeclczsmm`

## Inspected via service-role REST (2026-09-02)

Present: `spatial_share_tokens`, `spatial_walkthroughs`, `spatial_clips`, `spatial_pins`, `spatial_pin_attachments`

Missing: `spatial_project_items`, comments, activity, locators, files, `spatial_project_documents`, `spatial_compare_anchors`, `spatial_compare_issue_refs`, `spatial_project_shares`, `spatial_project_share_grants`

## Proposed apply order (not `db push`)

| File | Changes | Why | Destructive |
|---|---|---|---|
| `20260830120000_spatial_authoring_keyframes.sql` | `spatial_clips.orientation`; redaction `feather/style/keyframes` | Keyframed operator mask | no |
| `20260830140000_spatial_compare_anchors.sql` | compare tables | Compare UI if used | no |
| `20260830200000_spatial_project_items.sql` | items/docs/comments/activity | Project workspace | **STOP** — `DROP CONSTRAINT` on `spatial_audio_assets_kind_check` then wider CHECK. Use `tmp/spatial_project_items_additive_only.sql` instead. |
| `20260901120000_spatial_project_shares.sql` | hashed project shares | Project-level tokens | no |

## Apply status

`npx supabase db query --linked` → 401 LegacyDbConfigLoginRole  
Management API `/database/query` → 401  
`POSTGRES_URL` / `POSTGRES_PASSWORD` empty on this machine

HouseWalk operator patch applied via REST after title/building check: width 110, 6 keyframes. Not a SQL file apply.

Portal/items currently fall back to `spatial_pins` until tables exist.
