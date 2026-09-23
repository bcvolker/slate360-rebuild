# Repo cleanup inventory — Slice 12A

This is a proposal. Slice 12A did not redirect routes, delete files, or merge to `main`.

Slice 12B may implement only the rows Brian and the reviewer approve.

Re-audited against `feature/ui-vnext-phase1` after Slices 1–11. This is not a copy of the Slice 0 salvage map.

## Readiness

| Claim | Result |
|---|---|
| Paid-project pilot on `/vnext` URLs, with capture and project creation still on their current tools | Ready, with the legacy steps named in the pilot table |
| Full production route cutover | Not ready to execute. The matrix below is the proposal |
| Web product vs reconstruction | Separate. This branch does not claim the Gaussian pipeline is finished |

## Counts

| Action | Count | Meaning |
|---|---|---|
| KEEP | 18 | Still an operational or public contract. Do not point it at the client portfolio |
| REDIRECT | 12 | Proposed presentation cutover. Not implemented |
| DELETE | 0 | No file was proven unused, unrouted, and safe to remove |
| ARCHIVE | 4 | Hide from the product path after cutover. Do not delete the history |
| UPDATE DOC | 3 | Agent and status docs. Cutover destinations stay in this file until approved |
| DEFER | 8 | No vNext replacement, or an intentional Phase 1 limit |

`/preview/vnext/**` is inside KEEP as a test fixture, not a product route.

## Canonical entrypoints — proposed, not implemented

Login today sends an authenticated user to `/app` (`middleware.ts`). Desktop `/app` then sends them to `/dashboard`. Mobile `/dashboard` sends them to `/app`.

Those three homes are not the same job.

| Persona | Proposed home | Why |
|---|---|---|
| Authenticated client | `/vnext/projects` | Project portfolio. Included, published, renderable only |
| Operations owner | `/vnext/ops` | Needs-attention workspace. Not the client portfolio |
| Mobile field operator | Stay on the capture route they opened (`/site-walk/capture-v2`, `/site-walk/.../capture`, or the `/app` field shell) | Capture is not the client deliverable |

Do not send a capture URL to `/vnext/projects`.

Owner vs client cannot share one blind redirect of `/dashboard`. 12B has to branch on `canAccessOperationsConsole`.

## CUTOVER ROUTE MATRIX

No row in this table is implemented.

| Route | Current | Proposed | Persona | Device | Redirect? | Destination | Deep link | Keep backend? | Risk | Test required |
|---|---|---|---|---|---|---|---|---|---|---|
| `/dashboard` | Desktop shell. Mobile is sent to `/app` | Desktop owner → ops. Desktop client → portfolio. Mobile rule stays until the field shell is explicit | Owner and client | Desktop and mobile | Yes, persona-split | `/vnext/ops` or `/vnext/projects` | Preserve query | Yes, until 12B | Sending a field user to the portfolio | Both personas, phone and desktop |
| `/app` | Mobile field shell. Desktop is sent to `/dashboard` | Keep as the mobile field shell. Do not replace with the portfolio | Field operator | Mobile | No | — | — | Yes | Breaking Site Walk if `/app` is removed | Capture open, bottom nav, quarantine |
| `/projects` | Legacy project list | Client list becomes the portfolio | Client | Desktop | Yes | `/vnext/projects` | — | List data stays | Hiding `/projects/new` if the list redirect is too broad | Create still reachable |
| `/projects/new` | Mobile create wizard `app/(mobile)/projects/new` | Keep | Owner and field | Mobile | No | — | — | Yes | Pilot cannot create a project in vNext | Create still saves a project |
| `/projects/[projectId]` | Legacy project overview | vNext overview | Client | Desktop | Yes | `/vnext/projects/[projectId]` | Project id | Yes | Id mismatch | Same project opens |
| `/projects/[projectId]/plans` | Legacy plans tab | Published plans in Explore or Documents | Client | Desktop | Yes | `/vnext/projects/[id]/explore?rep=plan` when the sheet is the target, else Documents | Sheet id if present | Plan rows stay | Authoring upload must remain for the owner | Client sees published sheets only |
| `/projects/[projectId]/slatedrop` | Legacy files | Documents | Client | Desktop | Yes | `/vnext/projects/[id]/documents` | — | SlateDrop tables stay | Exposing files the client capability hides | Capability off hides Documents |
| `/projects/[projectId]/twins` | Legacy twin list | Explore Reality or Geometry | Client | Desktop | Yes | `/vnext/projects/[id]/explore` | Model id as `source` when it is one model | Models stay | Geometry vs Reality must stay independent | Unpublished model does not open |
| `/projects/[projectId]/walks` | Legacy visits | History | Client | Desktop | Yes | `/vnext/projects/[id]/history` | Session id → visit when it maps | Sessions stay | A walk that is still a capture tool | History shows published evidence only |
| `/projects/[projectId]/punch-list` | Legacy punch list | Items | Client | Desktop | Yes | `/vnext/projects/[id]/items` | Item id | Items stay | Questions and status rules | Item deep link |
| `/projects/[projectId]/photos` | Legacy photo tab | Do not redirect until it is clear this is a gallery and not capture management | Client | Desktop | No | — | — | Yes | Losing capture management | DEFER |
| `/projects/[projectId]/deliverables` | Deliverable editor | Keep the editor | Owner | Desktop | No | — | Deliverable id | Yes | vNext has no deliverable editor | Editor still opens |
| `/projects/[projectId]/team`, `/people` | Membership | No vNext screen | Owner | Desktop | No | — | — | Yes | Orphaned admin | DEFER |
| `/operations-console` | Owner console, including `[section]` and feedback | Presentation home moves. Subtools that vNext does not cover stay | Owner | Desktop | Partial | `/vnext/ops` for the home | Section name only when vNext has that section | Yes | Feedback and unknown sections | Owner home, unknown section |
| `/ceo` | Already redirects to `/operations-console` | After that home moves, `/ceo` follows it | Owner | Desktop | Already, then follow | `/vnext/ops` | — | — | Double hop | `/ceo` lands on ops |
| `/my-account` | Legacy account. Mobile quarantine sends this to `/app?blocked=account` | Desktop client → `/vnext/account`. Owner → `/vnext/ops/account`. Mobile quarantine stays | Client and owner | Both | Yes on desktop | Those two account pages | — | — | Billing UI must not return | No plans, seats, or upgrade |
| `/vnext`, `/vnext/projects`, `/vnext/ops` | Approved product | Keep | Client and owner | Both | No | — | Existing query | — | — | Already in `e2e/vnext` |
| `/site-walk`, `/site-walk/capture-v2` | Field capture | Keep | Field operator | Mobile | No | — | — | Yes | Portfolio redirect would stop capture | Open capture, not portfolio |
| `/digital-twin`, twin studio | Capture and processing | Keep | Owner | Desktop | No | — | Space and model ids | Yes | vNext is not the ingest tool | Processing row still appears in `/vnext/ops/processing` |
| `/share/project/[token]` | vNext public portal | Keep | Public recipient | Both | No | — | Token path | — | — | Slice 11 tests |
| `/view/[token]`, `/share/[token]`, `/share/deliverable/[token]`, `/share/twin/[token]`, `/share/thermal/[token]`, `/portal/[token]` | Specialized public links | Keep. Do not fold into `/share/project` | Public recipient | Both | No | — | Token | Yes | A similar path is a different token family | Each family still resolves |

## Candidates

### KEEP

| Path | Purpose | Routable | Referenced | Replacement | Backend | Risk if removed | Confidence |
|---|---|---|---|---|---|---|---|
| `app/vnext/**` | Approved client and owner product | Yes | Yes | — | Projects, scope, publications, shares | Product disappears | High |
| `app/share/project/**` | Anonymous project and evidence links | Yes | Yes | — | `project_share_links` | Public links die | High |
| `app/share/twin`, `app/share/thermal`, `app/share/deliverable`, `app/share/[token]`, `app/view`, `app/(public)/portal` | Older public contracts | Yes | Yes | None that preserves the token | Those token tables | Issued links break | High |
| `app/site-walk/capture-v2/**`, `app/site-walk/(act-2-inputs)/capture` | Field capture | Yes | Yes | None | Site Walk sessions and items | Cannot capture | High |
| `app/site-walk` walks, setup, assigned work | Operational Site Walk, not a client product tab | Yes | Yes | History is the client view of published evidence, not the capture tool | Same | Field workflow stops | High |
| `components/capture-v2/**` | Capture UI | No, imported by the routes | Yes | None | Uploads | Capture breaks | High |
| `ios/App/App/Plugins/LiDARCapture/**` | Native capture | Native | Yes | None | Twin ingest | Native capture breaks | High |
| `app/(dashboard)/thermal-studio/**`, `thermal-studio-v2/**` | CEO thermal work | Yes, gated | Yes | Dedicated `/share/thermal` is delivery, not authoring | Thermal tables | Cannot produce a thermal report | High |
| `app/(dashboard)/twin-studio/**` | Twin processing and preview | Yes | Yes | Explore only displays a published model | `digital_twin_*` | Cannot ingest | High |
| `app/(mobile)/**` including `/app` and `/projects/new` | Phone shell and the only audited project-create wizard | Yes | Yes | vNext has no create wizard | `projects` | Cannot start a project or use the phone shell | High |
| `workers/modal/**`, `src/trigger/**` | Heavy processing | No | Yes | — | Modal, Trigger | Jobs stop | High |
| `lib/twin/job-callback.ts` first-model legacy publish | Sets `published_model_id` for the old twin share | No | Yes | vNext does not read that column | `digital_twin_spaces` | Legacy twin shares change. vNext stays on explicit publish | High. Do not edit in 12B |
| `middleware.ts` mobile `/dashboard` ↔ `/app` and quarantine | Current device split | Yes | Yes | Persona split in 12B | — | Field users hit desktop UI | High. Do not edit in 12A |
| SW360 host rewrite in `next.config.ts` | Standalone Site Walk host | Yes | Yes | — | Same app | Branded SW360 host breaks | High |
| Stripe and billing modules | Existing commerce backend | Mixed | Yes | vNext must not show it | Stripe | Billing breakage outside this product | High. Forbidden edit zone |
| `app/preview/vnext/**` | Unauthenticated regression fixtures | Yes, unauthenticated | Tests | — | None | Losing the visual gate | High. KEEP TEST FIXTURE |
| Applied vNext SQL under `supabase/migrations/20260922*` and `20260923010000` | Schema already in production | No | Yes | — | Prod | Re-running or editing applied SQL | High |
| `app/sw.ts` kill-switch worker | Clears old caches and unregisters | Built to `public/sw.js` | Serwist | — | — | A caching worker could pin a pre-cutover shell | High. See PWA |

### REDIRECT

The twelve matrix rows marked Redirect? Yes or Partial. They are presentation routes. Their tables stay.

### DELETE

None. Looking unused is not proof. Capture, thermal, twin, and the public token families are still referenced. `_dashboard-legacy` is not a route (the folder is private) and has no imports, and it is still ARCHIVE rather than DELETE until 12B reviews it.

### ARCHIVE

| Path | Why not delete |
|---|---|
| `app/(dashboard)/_dashboard-legacy/page.tsx` | Private folder, no imports found. Keep the file until a reviewer accepts removal |
| Middleware `PHASE_1_BLOCKED_PATHS`: `/tours`, `/design-studio`, `/content-studio`, `/geospatial`, `/virtual-studio`, `/analytics`, `/tour-builder` | Already unreachable and sent to `/app`. The pages can remain until 12B |
| `app/(dashboard)/analytics`, `tours`, `content-studio-workspace` | Old product surfaces. `content-studio-workspace` is excluded from the block prefix on purpose |
| Older portal and marketplace docs under `docs/` that describe subscriptions or an app launcher as the current IA | Historical. Classify UPDATE or ARCHIVE per file in 12B. Do not mass-delete |

### UPDATE DOC

| Doc | 12A action |
|---|---|
| `docs/vnext/PHASE1_IMPLEMENTATION_STATUS.md` | Updated to record 12A and that 12B has not started |
| `docs/vnext/ENTITY_ACTION_SETTINGS_MATRIX.md` | Saved-view public share row now matches Slice 11 |
| `AGENTS.md`, `CLAUDE.md`, Cursor rules | Proposed text is below. Not applied, because the homes are not approved |

### DEFER

| Item | Why |
|---|---|
| vNext project-create wizard | Slice 9 left this. `/projects/new` still works |
| Password on `/share/project` | Slice 11 deferred it |
| Items and Documents on anonymous project links | No public-intent flag |
| Thermal inside the generic project link | Dedicated thermal token stays |
| `/projects/[projectId]/photos` | May be capture management |
| `/projects/[projectId]/deliverables` editor | No vNext editor |
| `/projects/[projectId]/team` and `/people` | No vNext membership screen |
| Reconstruction quality and Room 213 experiments | Other workstream. Do not merge onto this branch |

## Preview harness

| Group | Class |
|---|---|
| `app/preview/vnext/**` client, owner, scope, share | KEEP TEST FIXTURE |
| Empty, error, and loading fixtures | KEEP TEST FIXTURE |
| Deleting them after cutover | DELETE AFTER CUTOVER only if Playwright no longer uses them. Not in 12A |

## Documentation hygiene

| Class | Examples |
|---|---|
| CANONICAL | `docs/vnext/SLATE360_UI_PHASE1_MASTER_BUILD_PLAN.md`, `UI_DESIGN_RULES.md`, `ENTITY_ACTION_SETTINGS_MATRIX.md`, `PROJECT_CLIENT_DELIVERY_SCOPE.md`, `SAVED_VIEW_EVIDENCE_LINK.md`, `PROCESS_QA_PUBLISH.md`, `VNEXT_SHARING.md`, `CAPTURED_AND_PROPOSED.md`, this file, `PHASE1_RELEASE_CHECKLIST.md` |
| HISTORICAL | `docs/vnext/ROUTE_AND_COMPONENT_SALVAGE_MAP.md`, `PHASE1_IMPLEMENTATION_STATUS.md` slice notes, older `docs/design/*` that still describe a real backend |
| ARCHIVE | Docs that tell an agent the product is a subscription marketplace or an app launcher |
| DELETE | None in 12A |
| UPDATE | Agent guidance, after the entrypoints in this file are approved |

## Proposed agent guidance — do not apply until 12B

Add, without removing unrelated engineering rules:

- The client product is a project portal. Services are included per project. There is no vNext plan, seat, or upgrade screen.
- Client home, once cut over: `/vnext/projects`. Owner home: `/vnext/ops`.
- A client sees a source only when access, inclusion, publication, and renderability all hold.
- Captured evidence and any future proposed design stay separate. Phase 1 has no proposed mode.
- A service that is not included is absent. No locked tab and no upsell.
- Site Walk capture, twin ingest, and thermal studio stay. They are not client products.
- Reconstruction workers are a separate workstream.
- Public links: `/share/project/[token]` is the vNext portal. `/share/twin`, `/share/thermal`, `/view`, `/portal`, and `/share/deliverable` stay on their own tokens.

## PWA

`app/sw.ts` does not cache navigations. On activate it deletes caches, tells clients to reload, and unregisters. Serwist is disabled in development and still emits `public/sw.js` for production. A cutover should not be stranded on an old shell by this worker, because the worker's job is to remove itself. 12B should still confirm a production browser drops the worker after the first load. No service-worker rewrite in 12A.

## Database

Linked project `hadnfcenpcfaeclczsmm`. Queried `supabase_migrations.schema_migrations` on 2026-09-22. These six versions are applied and match the branch:

| Version | Name |
|---|---|
| 20260922120000 | project_client_capabilities |
| 20260922133000 | replace_project_client_scope |
| 20260922180000 | project_saved_views |
| 20260922220000 | project_source_release |
| 20260922233000 | project_source_release_closeout |
| 20260923010000 | project_share_links |

No duplicate of those versions was found in that result.

Final grants, after the closeout migration:

| Object | Authenticated | Anonymous | service_role |
|---|---|---|---|
| `project_client_capabilities` | Select if the user can access the project. Write if they can manage it. Owner UI also uses `replace_project_client_scope` | No policy for anon | Execute the replace function |
| `project_saved_views` | Select if they can access. Write if they can manage | No | Bypasses RLS |
| `project_source_publications` | Select if they can access. No insert policy. Publish is the RPC | No | `publish_project_source`, `revoke_project_source` |
| `project_source_reviews` | Closeout revoked table grants and the select policy | No | Full access. Owner QA uses the admin client |
| `project_share_links` | Revoked | Revoked | Table DML and `claim_project_share_open` |

Older migration history drift was not listed and was not repaired. That drift is not a Phase 1 blocker if these six objects match the branch, which they do. It remains a checklist item so nobody calls the database clean.

## Highest-risk 12B moves

1. Redirecting `/app` or `/site-walk/capture-v2` to the portfolio.
2. One redirect of `/dashboard` for both the owner and the client.
3. Redirecting `/projects/new` away before a vNext create flow exists.
4. Pointing a legacy share token at `/share/project`.
5. Deleting thermal studio, twin studio, or capture components because vNext does not render them.
