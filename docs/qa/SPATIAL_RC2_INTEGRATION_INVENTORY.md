# Spatial Walkthrough RC2 — live integration inventory

Captured 2026-08-30 from this machine. Prior reports were not trusted.

## Worktrees

| Path | Branch | HEAD | Dirty |
|---|---|---|---|
| `C:/s360` | `feature/spatial-walkthrough-audio` | `e6855f3c` | **Yes** — mixed nav HUD WIP + leftover editor untracked files + editor API diffs |
| `C:/s360-authoring` | `feature/spatial-walkthrough-editor` | `5645dbdf` | Clean |
| `C:/s360-portal-ux` | `feature/spatial-portal-ux` | `9dc23436` | Clean |
| `C:/s360-spatial-branding` | `feature/spatial-branding-polish` | `ba9ae8dd` | Clean |
| `C:/s360-spatial-live-smoke` | `feature/spatial-live-smoke` | `dbc57910` | Clean |
| `C:/s360-spatial-walkthrough` | `feature/spatial-walkthrough` | `b4690e02` | Clean |
| `C:/s360-viewer` | `feature/hybrid-twin-viewer-v0.1` | `ff0462a1` | Clean (unrelated twin viewer) |

`feature/spatial-walkthrough-rc1` is **not** checked out in a worktree. Local + origin: `45ff4343`.

## Spatial branches (local)

| Branch | HEAD | vs origin |
|---|---|---|
| `feature/spatial-walkthrough-rc1` | `45ff4343` | tracks origin |
| `feature/spatial-walkthrough-editor` | `5645dbdf` | **not pushed** |
| `feature/spatial-walkthrough-audio` | `e6855f3c` | tracks origin (audio **committed**; extra nav still uncommitted) |
| `feature/spatial-branding-polish` | `ba9ae8dd` | tracks origin |
| `feature/spatial-portal-ux` | `9dc23436` | tracks origin |
| `feature/spatial-privacy-publish` | `0764bc45` | tracks origin |
| `feature/spatial-live-smoke` | `dbc57910` | tracks origin |
| `feature/spatial-walkthrough` | `b4690e02` | tracks origin |
| `feature/spatial-chapters` | `574eaf63` | local only |

**Audio is not treated as finished for RC2.** It is on origin, but this integration will not merge it. Nav HUD that landed *inside* the audio commit plus remaining uncommitted HUD files will be extracted onto `feature/spatial-navigation-hud` from RC1.

## Dirty / untracked on `C:/s360` (audio worktree)

**Nav HUD to preserve (uncommitted):**

- `app/preview/spatial-nav/`
- `components/spatial-walkthrough/nav/SpatialNavPreview.tsx`
- `components/spatial-walkthrough/viewer/ClipEdgeActions.tsx`
- `components/spatial-walkthrough/viewer/NextChapterControl.tsx`
- `lib/spatial-walkthrough/clip-edge-actions.ts`
- `lib/spatial-walkthrough/nav-experience.test.ts`
- `scripts/ops/capture-spatial-nav.mjs`
- `.gitignore` (`/.spatial-nav-review/`)
- Dirty tracked: `WalkthroughShareClient.tsx`, `app/w/[token]/page.tsx`, `WalkthroughClientView.tsx`, `WalkthroughExperience.tsx`, `chapter-chrome.css`, `useChapterSession.ts`, `walkthrough-chrome.css`, `walkthrough-markers.css`, `chapter-preview-fixtures.ts`, `chapters.ts`, `chapters.test.ts`, `markers.ts`, `preview-fixtures.ts`, `spatial-walkthrough.test.ts`

**Already committed on audio HEAD (nav, not audio engine):** `path-hud.ts`, `nav-mode.ts`, `NavModeBar.tsx`, `useWalkthroughNav.ts`, `ShareCurrentView.tsx`, `briefing-script.ts` (placeholder cues only).

**Leftover editor files on this worktree — do not put on the nav branch:** studio timeline/keyframe panels, `keyframes.ts`, `orientation.ts`, `timeline-model.ts`, `privacy-review.ts`, `authoring.test.ts`, `20260830120000_spatial_authoring_keyframes.sql`, dirty `privacy-bake/route.ts` and `redactions/route.ts`, dirty `redaction.ts` keyframe fields.

## Migrations in git vs linked Supabase

**In repo (spatial):**

- `20260829180000_spatial_walkthrough.sql`
- `20260829200000_spatial_privacy_publish.sql`
- `20260829210000_spatial_chapters.sql`
- `20260829220000_spatial_rc1_public_derivative.sql`
- `20260830100000_spatial_audio_narration.sql` (audio — **not** for RC2)
- `20260830120000_spatial_authoring_keyframes.sql` (editor — **not applied**)

**In linked prod (`hadnfcenpcfaeclczsmm`):**

- Spatial tables exist: walkthroughs, clips, waypoints, pins, attachments, redactions, shares, chapters, clip_edges, processing_jobs, org_themes.
- **No** `spatial_narration_*` / audio tables.
- `spatial_clips` has `operator_patch`, `public_proxy_key`. **No `orientation`.**
- `spatial_redactions` has interval/sector/policy columns. **No `feather`, `style`, `keyframes`.**
- `supabase_migrations.schema_migrations` latest recorded version is `20260630180000`. August spatial SQL was applied out-of-band via `db query --linked -f` (tables exist; versions are not in that table). **Do not `db push`.** Apply authoring SQL the same targeted way.

## Trigger / Modal / Vercel (this machine)

| Surface | Observed |
|---|---|
| `@trigger.dev/sdk` in `package.json` | `4.4.6` (imports still `@trigger.dev/sdk/v3`) |
| `trigger.dev` (package.json) | `^4.4.5` |
| Installed SDK | `4.4.6` |
| `npx trigger.dev --version` | `4.4.5` |
| `npx trigger.dev@latest --version` | `4.5.14` — **CLI/SDK family split is real** |
| Trigger project | `proj_ydquoejbfqidzbjioyno` |
| Spatial task | `spatial-walkthrough.ingest` in `src/trigger/spatial-walkthrough-ingest.ts` |
| Modal CLI | Windows `python` is the Store stub. **WSL** `python3 -m modal` → client `1.5.5`, profile `bcvolker` |
| Modal worker | `workers/modal/spatial-walkthrough/ingest.py` — `bake_public_proxy` still a **single static mask PNG** |
| Vercel whoami | `slate360ceo-8370` |
| Production `/api/deploy-info` | commit `ff0462a1`, branch **`main`** (twin viewer). **Do not replace production with RC2.** Preview deploys only unless policy says otherwise. |

## Post-integration (same day, RC2 worktree)

| Path | Branch | HEAD |
|---|---|---|
| `C:/s360-nav-hud` | `feature/spatial-navigation-hud` | `b4cec64b` (pushed) |
| `C:/s360-authoring` | `feature/spatial-walkthrough-editor` | `5645dbdf` (pushed) |
| `C:/s360-rc2` | `feature/spatial-walkthrough-rc2` | local merge `f922b98e` + bake WIP |

**Authoring migration applied** to linked prod via `npx supabase db query --linked --workdir C:\s360 -f …/20260830120000_spatial_authoring_keyframes.sql`. Verified:

- `spatial_clips.orientation` jsonb
- `spatial_redactions.feather` double precision
- `spatial_redactions.style` text
- `spatial_redactions.keyframes` jsonb

Audio **not** merged. Nav HUD extracted to `feature/spatial-navigation-hud` (not from the audio branch).

Trigger pin: `trigger.dev` **4.4.6** to match `@trigger.dev/sdk` 4.4.6. Deploy with `npx trigger.dev@4.4.6 deploy`.

Bake: piecewise PUBLIC derivative (`bake_privacy.py` + `bake_public_proxy`). CLIENT interpolates operator keyframes live. PUBLIC player strips skip/operator-patch (already in the file). MASTER never rewritten.


1. Isolate uncommitted + audio-committed nav HUD onto `feature/spatial-navigation-hud` from RC1. Push.
2. Push `feature/spatial-walkthrough-editor` @ `5645dbdf`.
3. Apply only `20260830120000_spatial_authoring_keyframes.sql` via linked SQL. Verify columns.
4. Create `feature/spatial-walkthrough-rc2` from RC1. Merge editor, then nav. Do not merge audio.
5. Upgrade Modal bake to piecewise keyframe/orientation/skip derivatives. Redeploy Modal + Trigger.
6. Align Trigger CLI to the 4.4.x family already in `package.json` (or bump SDK to match 4.5.x — one family only).
7. Vercel preview for RC2. HouseWalk E2E + screenshots.
