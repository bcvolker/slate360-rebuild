# Delegation Prompt — M8 zone planner for large captures

Give this to another AI platform. It needs no repo access. Paste the returned code back
verbatim; it is a single self-contained module plus its test file.

**Why this one:** jobs are capped at 2 hours of wall clock (`MAX_DURATION_SECONDS = 7200`),
which is roughly 1,500–2,000 views. Any building bigger than a house exceeds it and currently
fails outright. This module is what turns a warehouse into N jobs that stitch back together.

---

Write a Python module `zone_planner.py` and its pytest file `test_zone_planner.py`.
No other files. It drops into an existing project unchanged, so follow the constraints exactly.

## Hard constraints

- **Python 3.10.** Imports allowed: `numpy` and the standard library. **Nothing else** — no
  Open3D, no scipy, no sklearn, no networkx. This module is pure planning logic and must be
  importable in a bare environment.
- **Licence-critical:** numpy (BSD) only. Nothing GPL/AGPL.
- Import `numpy` **inside functions**, never at module top level.
- Every public function: full type-annotated signature and a docstring saying what it does
  **and what it does when the input is degenerate**.
- No `print`. Return plain dicts and lists (JSON-serialisable — these cross a network boundary
  to a job dispatcher). No numpy scalars in returned structures; cast to `float`/`int`.
- Never raise on awkward input — return a single zone containing everything and say why.
- Whole module under 300 lines.

## Domain context

Input is the **pose list** from one capture: every frame the operator recorded, in **capture
order**, each with a timestamp and a world-space camera position. A single walk through a
building might be 6,000 frames over 40 minutes. Positions are metric, **+Y up**.

Downstream, each zone is dispatched as its own reconstruction job, and the resulting models
are stitched into one coordinate frame.

### Three things that make this harder than "chunk the list"

1. **Temporal contiguity is mandatory.** A zone must be a *contiguous run of frames*. You may
   not gather all the frames near a point across the whole walk — reconstruction depends on
   the sequential relationship between neighbouring frames, and shuffling destroys it.
2. **Adjacent zones must physically overlap**, or the stitch has nothing to register against.
   Overlap is measured in *shared covered space*, not in shared frame count.
3. **Operators revisit.** A walk commonly passes through the same lobby three times. Two
   non-adjacent zones may legitimately occupy the same space; that is a stitching *opportunity*,
   not a bug, and it must be reported rather than suppressed.

## Required public functions

### 1. `path_length(positions) -> float`

Total distance travelled along the ordered positions. Fewer than 2 positions → `0.0`.

### 2. `split_into_runs(poses, max_frames, *, overlap_frames=60) -> list[dict]`

Split the ordered pose list into contiguous runs of at most `max_frames`, where **consecutive
runs share `overlap_frames` frames**. Each run:
`{"index": int, "start": int, "end": int, "frame_count": int, "overlap_prev": int}`
(`end` exclusive).

Rules:
- Every frame appears in at least one run. Assert this in your own tests.
- `overlap_frames` is clamped to at most `max_frames // 3` — an overlap that large means the
  chunking is pathological and the caller needs fewer, bigger zones, not more redundancy.
- A pose list at or under `max_frames` returns exactly one run with `overlap_prev = 0`.

### 3. `zone_bounds(positions) -> dict`

Axis-aligned bounds of a set of positions:
`{"min": [x,y,z], "max": [x,y,z], "centre": [x,y,z], "diagonal": float}`.
Empty input returns all-zeros with `diagonal: 0.0` rather than raising.

### 4. `spatial_overlap(bounds_a, bounds_b) -> float`

Intersection-over-union of two axis-aligned boxes, in `[0, 1]`. Non-overlapping → `0.0`.
Identical → `1.0`. This is the measure of whether two zones can be stitched.

### 5. `find_revisits(zones, *, min_overlap=0.15) -> list[dict]`

Every pair of **non-adjacent** zones whose bounds overlap by at least `min_overlap`:
`[{"a": int, "b": int, "overlap": float}]`. Adjacent pairs are excluded because their overlap
is engineered by `split_into_runs` and says nothing new. These pairs are extra stitching
constraints — a loop closure the reconstruction can exploit.

### 6. `plan_zones(poses, *, max_frames=1500, overlap_frames=60, min_overlap=0.15) -> dict`

Orchestrator. Returns:

```python
{
  "zones": [ {"index", "start", "end", "frame_count", "overlap_prev",
              "bounds": {...}, "path_length": float,
              "estimated_seconds": float} ],
  "revisits": [ ... ],
  "total_frames": int,
  "zone_count": int,
  "warnings": list[str],
}
```

- `estimated_seconds` uses the measured cost model **900 + 3.5 × frame_count** (a ~15 min fixed
  overhead plus ~3.5 s per view). Put that model in a named module constant, not inline.
- Emit a warning when any zone's `estimated_seconds` exceeds **7200** — the hard job ceiling.
- Emit a warning when a zone's bounds diagonal is under **2.0 m**: the operator barely moved,
  and a zone that small will not reconstruct (this is exactly the collapse mode that produced
  a 3.23 m model of a 13.71 m room).
- Emit a warning when consecutive zones have `spatial_overlap` below `min_overlap` despite the
  frame overlap — it means the operator moved fast through the seam and the stitch is at risk.
- Fewer than 2 poses returns one zone covering everything, `zone_count: 1`, and a warning.

## Tests required (`test_zone_planner.py`)

pytest, `numpy` only — everything here must run in a bare environment. At least 20 assertions.

Cover at minimum:
1. `path_length`: straight 10 m line → 10.0; single point → 0.0; empty → 0.0.
2. `split_into_runs` on 100 frames with `max_frames=100` → exactly 1 run, `overlap_prev` 0.
3. `split_into_runs` on 5,000 frames, `max_frames=1500`, `overlap_frames=60`: **every frame
   index appears in at least one run** (assert by building a set), consecutive runs share
   exactly 60 frames, and no run exceeds 1,500.
4. `overlap_frames=1000` with `max_frames=1500` is clamped to 500.
5. `spatial_overlap`: identical boxes → 1.0; disjoint → 0.0; a box overlapping half of another
   → the correct IoU, computed by hand in the test.
6. `find_revisits` on a synthetic figure-of-eight path finds the crossing pair and **does not**
   report adjacent zones.
7. `plan_zones` on a 6,000-frame straight-line walk: `zone_count` > 1, zones are contiguous and
   ordered, no `estimated_seconds` over 7200, and the returned structure is JSON-serialisable
   (assert `json.dumps(result)` succeeds — this catches leaked numpy scalars).
8. `plan_zones` warns on a stationary capture (all positions identical → tiny diagonal).
9. `plan_zones` on an empty pose list returns one zone and a warning, and does not raise.

## Deliverable

Return the two complete files in full, nothing else. No prose, no partial snippets, no "rest
unchanged" markers. Where a requirement is ambiguous, choose the option that **keeps frames
together and reports a warning**, rather than one that drops frames to satisfy a limit — a
dropped frame is a hole in the client's building.
