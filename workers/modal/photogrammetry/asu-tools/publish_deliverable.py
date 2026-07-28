r"""Publish the hosted ASU_DELIVERABLE/ folder from the current root deliverables
in one atomic step, with a manifest hash of source files.

Phase 0T finding: ASU_DELIVERABLE/index.html was a full session (~18 hours) behind
THERMAL_VIEWER_P1.html because it was copied once by hand and never refreshed --
exactly the "mixed generations" failure mode the reviewers warned about. This
script is the single source of truth for publishing; run it after every viewer
rebuild. It always overwrites the full set together, so root and hosted can never
diverge silently again.
"""
import hashlib
import json
import shutil
import time
from pathlib import Path

DELIV = Path(r"C:\ASU-Survey\deliverables")
OUT = DELIV / "ASU_DELIVERABLE"


def sha1(path, chunk=1 << 20):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        while b := f.read(chunk):
            h.update(b)
    return h.hexdigest()[:12]


OUT.mkdir(exist_ok=True)
# 3D tab = dd_mesh.glb, TERRAIN tab = dd_points.bin (+meta). These REPLACE the
# old coverage/splat assets, which are no longer referenced by the viewer.
# Publishing HTML without these would leave 3D/TERRAIN empty -- the exact
# failure mode that shipped a stale build before.
files = {
    "THERMAL_VIEWER_P1.html": "index.html",
    "dd_mesh.glb": "dd_mesh.glb",
    "dd_points.bin": "dd_points.bin",
    "dd_points_meta.json": "dd_points_meta.json",
}
manifest = {"published_at_epoch": time.time()}
for src, dst in files.items():
    sp = DELIV / src
    if not sp.exists():
        print("MISSING (skipped):", src)
        continue
    dp = OUT / dst
    shutil.copy2(sp, dp)
    manifest[dst] = {"sha1_12": sha1(sp), "bytes": sp.stat().st_size,
                     "source_mtime": sp.stat().st_mtime}
    print("published %-24s -> %-24s  %8.1f MB  sha1 %s"
          % (src, dst, sp.stat().st_size / 1e6, manifest[dst]["sha1_12"]))

tiles_src, tiles_dst = DELIV / "tiles", OUT / "tiles"
if tiles_src.exists():
    if tiles_dst.exists():
        shutil.rmtree(tiles_dst)
    shutil.copytree(tiles_src, tiles_dst)
    n = sum(1 for _ in tiles_dst.rglob("*.jpg")) + sum(1 for _ in tiles_dst.rglob("*.png"))
    manifest["tiles"] = {"count": n, "source_mtime": tiles_src.stat().st_mtime}
    print("published tiles/ -> %d files" % n)

json.dump(manifest, open(OUT / "_publish_manifest.json", "w"), indent=1)
print("wrote _publish_manifest.json -- ASU_DELIVERABLE is now current with root")
