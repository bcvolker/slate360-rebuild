"""Split Spark's packed colour/alpha loss: per-splat colour clamp to [0,1] vs 8-bit colour vs 8-bit a/2 alpha (CPU)."""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from cpu_raster import load_model, prepare, raster  # noqa: E402

CROPS = {"carpet_a0_indep_f640": (660, 440, 788, 536), "carpet_a0_fixed_f640": (460, 500, 588, 596)}


def main(dd, out_json):
    dd = Path(dd)
    views = {v["name"]: v for v in json.load(open(dd / "refs" / "views.json"))["views"]}
    gs = lambda im: 0.2126 * im[..., 2].astype(float) + 0.7152 * im[..., 1] + 0.0722 * im[..., 0]
    fb = lambda g: g - cv2.GaussianBlur(g, (0, 0), 1.5)
    res = {}
    for model in ("golden", "edge"):
        m = load_model(dd / f"{model}_export.ply")
        for vn, crop in CROPS.items():
            x0, y0, x1, y1 = crop
            ref = cv2.imread(str(dd / "refs" / f"ref_{vn}.png"))[y0:y1, x0:x1]
            s = fb(gs(ref))[6:-6, 6:-6]; s0 = s - s.mean()
            base = prepare(m, views[vn], crop)
            col = base["col"]
            rec = {"splatColourOutside01_frac": float(((col < 0) | (col > 1)).any(1).mean()),
                   "splatColourAbove1_frac": float((col > 1).any(1).mean()), "splatColourBelow0_frac": float((col < 0).any(1).mean())}
            for nm, fn in (("none", lambda p: p),
                           ("colourClamp01", lambda p: {**p, "col": np.clip(p["col"], 0, 1)}),
                           ("colour8bitNoClamp", lambda p: {**p, "col": np.round(p["col"] * 255) / 255}),
                           ("alphaHalf8bit", lambda p: {**p, "o": np.round(np.clip(p["o"] / 2, 0, 1) * 255) / 255 * 2})):
                im, _ = raster(fn(dict(base)), crop, "spark")
                r = fb(gs(im))[6:-6, 6:-6]; r0 = r - r.mean()
                rec[nm] = {"fineCoherentGain": round(float((r0 * s0).mean() / (s0 ** 2).mean()), 3),
                           "meanLumaMinusRef": round(float(gs(im).mean() - gs(ref).mean()), 2)}
            res[f"{model}/{vn}"] = rec
            print(model, vn, json.dumps(rec), flush=True)
    json.dump(res, open(out_json, "w"), indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:3])
