"""UV layouts for atlas texturing, with a hard time budget.

xatlas produces good charts but it is a C extension that holds the GIL for its
whole run. Measured on the 2026-08-25 kitchen, a 242k-face unwrap ran past 15
minutes — and because the GIL was held, the worker could not answer Modal's
heartbeat, so the platform killed the container and retried it in a loop. The
job never failed; it never finished either, and it burned the budget several
times over.

So xatlas runs in a SUBPROCESS with a timeout. The parent keeps its GIL, keeps
heart-beating, and can kill a run that overruns. If it does overrun there is a
deterministic fallback that always finishes, because a soft-but-present texture
beats no texture and beats a dead container.

Licences: xatlas MIT, numpy BSD.
"""

from __future__ import annotations

from typing import Any

# Wall-clock budget for chart-based unwrapping before the fallback takes over.
UNWRAP_TIMEOUT_S = 420.0


def _unwrap_worker(vertices, triangles, resolution, queue):  # pragma: no cover
    """Child-process entry point. Never called in-process."""
    import numpy as np
    import xatlas

    atlas = xatlas.Atlas()
    atlas.add_mesh(
        np.ascontiguousarray(vertices, dtype=np.float32),
        np.ascontiguousarray(triangles, dtype=np.uint32),
    )
    chart_options = xatlas.ChartOptions()
    chart_options.max_iterations = 1
    pack_options = xatlas.PackOptions()
    pack_options.resolution = int(resolution)
    pack_options.padding = 2
    pack_options.bruteForce = False
    atlas.generate(chart_options=chart_options, pack_options=pack_options)
    vmap, idx, uv = atlas[0]
    queue.put(
        (
            np.asarray(vmap).tolist(),
            np.asarray(idx).tolist(),
            np.asarray(uv, dtype=np.float64).tolist(),
            float(atlas.width or resolution),
            float(atlas.height or resolution),
        )
    )


def unwrap_charts(vertices: Any, triangles: Any, *, resolution: int, timeout_s: float = UNWRAP_TIMEOUT_S):
    """xatlas unwrap in a killable subprocess. Returns None if it overruns."""
    import multiprocessing as mp

    import numpy as np

    try:
        # FORK, not spawn. Spawn re-imports the parent's __main__ in the child —
        # and inside a Modal container __main__ is the platform's own runner, so
        # the child would try to boot a second worker instead of unwrapping a
        # mesh. Fork inherits the already-loaded modules and starts immediately.
        # (Falls back to the default context off Linux, where fork is absent.)
        try:
            ctx = mp.get_context("fork")
        except ValueError:
            ctx = mp.get_context()
        queue: Any = ctx.Queue()
        proc = ctx.Process(
            target=_unwrap_worker,
            args=(np.asarray(vertices, dtype=np.float32), np.asarray(triangles, dtype=np.uint32),
                  int(resolution), queue),
        )
        proc.start()
        try:
            result = queue.get(timeout=float(timeout_s))
        except Exception:  # noqa: BLE001 — queue.Empty and friends
            result = None
        proc.join(timeout=5)
        if proc.is_alive():
            proc.terminate()
            proc.join(timeout=5)
        if result is None:
            return None
    except Exception:  # noqa: BLE001
        return None

    vmap, idx, uv, width, height = result
    uv = np.asarray(uv, dtype=np.float64)
    # xatlas reports UVs in PIXELS once a pack resolution is set, not in [0,1].
    if uv.size and uv.max() > 1.5:
        uv[:, 0] /= max(width, 1.0)
        uv[:, 1] /= max(height, 1.0)
    return np.asarray(vmap), np.asarray(idx), np.clip(uv, 0.0, 1.0)


def unwrap_grid(triangles: Any, *, resolution: int, padding: int = 2):
    """Deterministic fallback: give every triangle its own cell in the atlas.

    No chart merging, no search, no C extension — cost is a fixed O(faces), so
    it cannot be the reason a job stalls. Each triangle maps to the lower-left
    half of a square cell, which wastes just under half the atlas and puts a
    seam on every edge. Both are real costs, and both are far smaller than the
    4.5 cm-per-sample smear this exists to replace: at 80k faces in a 4096
    atlas each triangle still gets roughly a 14x14 texel patch.

    Returns (vertex_map, face_indices, uvs) with vertices split per triangle,
    matching xatlas's contract so callers need no special case.
    """
    import numpy as np

    tris = np.asarray(triangles)
    n = int(len(tris))
    if n == 0:
        return np.zeros(0, dtype=np.int64), np.zeros((0, 3), dtype=np.int64), np.zeros((0, 2))

    cols = int(np.ceil(np.sqrt(n)))
    cell = 1.0 / cols
    pad = float(padding) / max(int(resolution), 1)
    inner = max(cell - 2.0 * pad, cell * 0.1)

    face = np.arange(n)
    cx = (face % cols) * cell + pad
    cy = (face // cols) * cell + pad

    # Corner layout matches the triangle's own winding, so barycentrics computed
    # in UV space correspond to the same corners in 3D.
    uv = np.empty((n * 3, 2), dtype=np.float64)
    uv[0::3, 0], uv[0::3, 1] = cx, cy
    uv[1::3, 0], uv[1::3, 1] = cx + inner, cy
    uv[2::3, 0], uv[2::3, 1] = cx, cy + inner

    vmap = tris.reshape(-1).astype(np.int64)
    idx = np.arange(n * 3, dtype=np.int64).reshape(n, 3)
    return vmap, idx, np.clip(uv, 0.0, 1.0)
