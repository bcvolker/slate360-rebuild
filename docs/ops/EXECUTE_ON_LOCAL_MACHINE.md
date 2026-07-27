# Executable handoff — run top to bottom on `C:\s360`

Status: **READY** · 2026-07-27 · Branch: `claude/dronedeploy-reconstruction-analysis-py2toz`

**For a Claude Code session running on Brian's Windows machine.** Every item below is a command
with an expected result and a verification step. Run them in order; each says what to do if it
fails. **Do not read any other doc to execute this file.**

Brian is a non-coder. He should not be running these by hand — paste this file's path to the
local Claude Code session and let it execute.

Conventions: PowerShell. Chain with `;` not `&&`. Prefix Modal/Trigger with
`$env:PYTHONIOENCODING='utf-8'` or the CLI crashes on emoji in the cp1252 console.

---

## 0. Preflight — confirm you are on the right machine and branch

```powershell
cd C:\s360
git fetch origin
git checkout claude/dronedeploy-reconstruction-analysis-py2toz
git pull origin claude/dronedeploy-reconstruction-analysis-py2toz
```

**Verify — all three must succeed. If any fails, STOP; you are not on the machine of record.**
```powershell
npx vercel whoami                                  # expect: slate360ceo-8370
$env:PYTHONIOENCODING='utf-8'; python -m modal profile current   # expect: bcvolker
git rev-parse --abbrev-ref HEAD                    # expect: claude/dronedeploy-reconstruction-analysis-py2toz
```

---

## 1. Commit the untracked ASU scripts  ⛔ BLOCKING

These files exist only on this machine. Everything about the DroneDeploy comparison is
unreproducible until they are in git.

```powershell
cd C:\s360
mkdir -Force workers\modal\photogrammetry\asu-tools
Copy-Item C:\ASU-Survey\tools\*.py workers\modal\photogrammetry\asu-tools\ -Force
foreach ($f in @('georef_app.py','patch_ortho.py','stats_app.py')) {
  if (Test-Path "C:\s360\$f") { Copy-Item "C:\s360\$f" workers\modal\photogrammetry\ -Force }
  elseif (Test-Path "C:\ASU-Survey\$f") { Copy-Item "C:\ASU-Survey\$f" workers\modal\photogrammetry\ -Force }
  else { Write-Warning "NOT FOUND: $f — search for it and report the path" }
}
```

**Check for secrets before staging.** These scripts may contain hardcoded keys; GitHub push
protection will reject the push if so.
```powershell
Select-String -Path workers\modal\photogrammetry\asu-tools\*.py, workers\modal\photogrammetry\*.py `
  -Pattern 'sk-|eyJ|AKIA|secret|token|password|api[_-]?key' -CaseSensitive:$false
```
If that prints anything, replace the literal with `os.environ["NAME"]` before continuing.

**Stage explicit paths only — never `git add .`:**
```powershell
git add workers/modal/photogrammetry/asu-tools
git add workers/modal/photogrammetry/georef_app.py workers/modal/photogrammetry/patch_ortho.py workers/modal/photogrammetry/stats_app.py
git commit -m "chore(asu): commit the untracked mesh and scoring scripts

The ASU mesh and every published measurement came from these files, which were
never in version control. Without them the DroneDeploy head-to-head is not
reproducible and the numbers cannot be reviewed."
git push origin claude/dronedeploy-reconstruction-analysis-py2toz
```

**Verify:**
```powershell
git ls-files workers/modal/photogrammetry/ | Measure-Object   # expect Count > 2
```

---

## 2. Apply the pending migration  ⛔ BLOCKING

Activates the duplicate-upload fix and the stale-upload GC. Both are already code-complete and
inert until this runs. **The migration is additive and idempotent — safe to run twice.**

```powershell
cd C:\s360
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx supabase db query --linked -f supabase/migrations/20260725120000_twin_asset_dedup.sql
```

**Verify — all three must return a row:**
```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx supabase db query --linked --query "select column_name from information_schema.columns where table_name='digital_twin_capture_assets' and column_name='client_fingerprint';"
npx supabase db query --linked --query "select indexname from pg_indexes where indexname='digital_twin_capture_assets_capture_fingerprint_uniq';"
npx supabase db query --linked --query "select proname from pg_proc where proname='gc_stale_digital_twin_upload_assets';"
```
Empty result on any = the migration did not apply. Report the error, do not retry blindly.

---

## 3. Arm B — native-resolution texture  💰 CPU only, no GPU

The cheapest experiment in the plan, and possibly most of the quality gap. Tests whether "soft
and mushy at native zoom" was a **texture** problem rather than a geometry problem.

```powershell
cd C:\s360\workers\modal\photogrammetry
$env:PYTHONIOENCODING='utf-8'
python -m modal deploy worker.py
python -m modal run --detach worker.py::texture_workspace
```

**Verify — expect ~917 undistorted images at native resolution:**
```powershell
$env:PYTHONIOENCODING='utf-8'
python -m modal volume ls asu-rgb-flights /work/texture/images | Measure-Object
```

### 3b. The controlled comparison — this is what makes the result mean anything

> **INVARIANT: the same mesh file, textured twice.** Not "equivalent settings" — literally the
> same file, verified by hash. If the mesh differs between arms, the experiment measures nothing.

```powershell
# Record the mesh identity BEFORE either texturing run
Get-FileHash <path-to-mesh.ply> -Algorithm SHA256
```

Then run `colmap mesh_texturer` **twice against that same mesh**, changing only `--image_path`:
- **Arm A (control):** `--image_path /work/dense/images`   ← 1600 px
- **Arm B:** `--image_path /work/texture/images`           ← native

Re-hash the mesh afterwards and confirm it is unchanged. Report both textured outputs plus:
render crops at native zoom, file sizes, and wall-clock per arm.

**Do not run the higher-resolution MVS ladder (2400/3200) yet.** If Arm B closes the gap, that
GPU spend may be unnecessary.

---

## 4. Memory profile (M0) — before any GPU purchase decision

The 1600 px dense cap exists because 917 images OOM a 24 GB A10G. Measure where the memory goes
before assuming an A100 is required.

```powershell
cd C:\s360\workers\modal\photogrammetry
$env:PYTHONIOENCODING='utf-8'
python -m modal run --detach worker.py::dense --max-image-size 2400 --workspace dense2400
```

Watch peak memory in the Modal dashboard. `dense()` now logs the native-vs-cap downscale ratio
at startup, and `workspace` keeps arms from overwriting each other.

**Report:** peak RSS, peak VRAM, wall clock, and whether it OOMed. If it completes on the A10G,
the A100 question is closed.

---

## 5. Reprocess a benchmark capture through the pose-prior arm

No new fieldwork — the captures already exist.

```powershell
cd C:\s360
node scripts/ops/list-twin-benchmarks.mjs
node scripts/ops/dispatch-twin-experiment.mjs --capture <id-from-above> --train-profile quality
```

**Note the profile split that landed this week:** `quality` now freezes the cameras and is
metric. `visual` refines camera poses, looks better, and is stamped `metricAuthority: false`
because its splat is no longer in the mesh's frame. **For any measurable twin, use `quality`.**

**Verify:**
```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'
npx supabase db query --linked --query "select id, quality_metrics->>'trainProfile' as profile, quality_metrics->>'metricAuthority' as metric, quality_metrics->>'alignBackend' as backend from digital_twin_models order by created_at desc limit 5;"
```

---

## 6. Report back

Post into the web session (or commit to `docs/ops/EXECUTION_LOG.md`):

1. Which steps completed, which failed, and the exact error text for any failure.
2. Arm A vs Arm B: both renders, the mesh SHA-256 (proving it was the same mesh), file sizes,
   wall clock.
3. M0: peak memory, wall clock, OOM yes/no.
4. Migration verification output (the three queries from §2).
5. The benchmark model's `quality_metrics` row.

**Do not promote any arm to default.** Every promotion needs a human visual gate — Brian
comparing two share links side by side. That is a deliberate rule, not an oversight.

---

## Notes for the executing session

- **Never `git add .`** — stage explicit paths. A stray `.env.local` in a commit means rotating
  every key in the project.
- **Forbidden edit zones (read-only):** entitlements, billing, Stripe, middleware, and
  **existing** migrations. Writing a *new* additive migration is fine; editing an applied one is
  not.
- **Redeploy Trigger** (`npx trigger.dev@latest deploy`) after any change to `src/trigger/**` or
  any Modal endpoint URL. Modal current + Trigger stale = jobs sit `queued` and the green buttons
  appear to do nothing.
- **No hardcoded hex** in any UI change — design tokens only; `guard:design` enforces it.
- Run before pushing: `npm run guard:architecture` (currently clean).
  `guard:design` and `guard:file-size-regression` **already fail on a clean tree** for unrelated
  pre-existing TS/TSX files — that is not something this work introduced, and not something to
  "fix" as a side quest.
