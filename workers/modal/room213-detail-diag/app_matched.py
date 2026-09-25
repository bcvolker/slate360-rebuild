"""App-level check: frames captured from the REAL Slate360 viewer (/preview/room213-splat, SplatViewerCore) at a
source-camera centre, scored against the source rectified through the app's OWN camera (its logged matrixWorld,
projection and drawing-buffer size). Valid because the app camera sits exactly at the source camera centre, so a
rotation-only rectification of that source is exact (same method as views.py: 4x4 supersampled KB-fisheye rays).

usage: python app_matched.py <dd dir> <caps dir> <tag_before> <tag_after> <sourceView> <out.json>"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import views  # noqa: E402
from analyze import bands, band_stats, luma  # noqa: E402

F = np.diag([1.0, -1.0, -1.0])     # the viewer's Rx(pi) flip (its own inverse)


def app_camera(meta, Wb, Hb):
    m = np.array(meta["camera"]["matrixWorld"]).reshape(4, 4).T          # three.js column-major
    R3, p3 = m[:3, :3], m[:3, 3]
    P = np.array(meta["camera"]["projection"]).reshape(4, 4).T
    f = 0.5 * Hb * P[1, 1]
    fx = 0.5 * Wb * P[0, 0]
    return F @ R3 @ F, F @ p3, f, fx


def main(dd, caps, tag_b, tag_a, source_view, out):
    dd, caps = Path(dd), Path(caps)
    mb = json.load(open(caps / f"app_{tag_b}.json")); ma = json.load(open(caps / f"app_{tag_a}.json"))
    B = cv2.imread(str(caps / f"app_{tag_b}.png")); A = cv2.imread(str(caps / f"app_{tag_a}.png"))
    Hb, Wb = B.shape[:2]
    Rc2w, C, f, fx = app_camera(ma, Wb, Hb)
    cams, imgs = views.read_colmap(dd / "src" / "sparse" / "0")
    Rs, ts, cid = imgs[source_view]
    Csrc = -Rs.T @ ts
    views.W, views.H = Wb, Hb
    src = cv2.imread(str(dd / "src" / "images" / source_view)); mask = cv2.imread(str(dd / "src" / "masks" / source_view), 0)
    ref, ok = views.rectify(src, mask, Rc2w, f, Rs, cams[cid][3])
    cv2.imwrite(str(caps / f"ref_{tag_a}.png"), ref)
    res = {"drawingBuffer": [Wb, Hb], "focalPx": [fx, f], "cameraCentreMinusSourceCentre": float(np.abs(C - Csrc).max()),
           "sameCameraBeforeAfter": bool(np.allclose(mb["camera"]["matrixWorld"], ma["camera"]["matrixWorld"])),
           "effectiveBefore": mb["effective"], "effectiveAfter": ma["effective"]}
    # carpet ROI = the lower-middle band of this view (floor), valid-source pixels only
    x0, y0, x1, y1 = int(Wb * 0.30), int(Hb * 0.62), int(Wb * 0.70), int(Hb * 0.95)
    m = np.zeros((Hb, Wb), bool); m[y0:y1, x0:x1] = True
    m &= cv2.erode(ok.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    res["roi"] = [x0, y0, x1, y1]; res["scoredPixels"] = int(m.sum())
    bs = bands(luma(ref))
    for lab, im in (("before", B), ("after", A)):
        br = bands(luma(im))
        res[lab] = {k: band_stats(br[k], bs[k], m) for k in ("fine", "mid")}
        res[lab]["meanRgbMinusSource"] = (im[m].astype(float).mean(0) - ref[m].astype(float).mean(0))[::-1].round(2).tolist()
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    tiles = []
    for nm, im in (("source (rectified at app camera)", ref), ("app before (default profile)", B), ("app after (spirula-3dgut)", A)):
        c = im[cy - 90:cy + 90, cx - 160:cx + 160].copy()
        c = cv2.resize(c, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
        c = cv2.copyMakeBorder(c, 22, 0, 0, 3, cv2.BORDER_CONSTANT, value=(0, 0, 0))
        cv2.putText(c, nm, (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1); tiles.append(c)
    cv2.imwrite(str(caps / f"sheet_{tag_a}.png"), np.hstack(tiles))
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k not in ("effectiveBefore", "effectiveAfter")}, indent=1))


if __name__ == "__main__":
    main(*sys.argv[1:7])
