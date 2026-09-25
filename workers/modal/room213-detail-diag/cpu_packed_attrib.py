"""Which field of Spark's packed accumulator costs the carpet detail? CPU instrumentation only: quantize ONE field at a
time (as packSplatEncoding does) and re-run the validated CPU Spark model on the same crops.
usage: python cpu_packed_attrib.py <dd dir> <out json>"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from cpu_raster import load_model, oct88r8, prepare, raster  # noqa: E402

CROPS = {"carpet_a0_indep_f640": (660, 440, 788, 536), "carpet_a0_fixed_f640": (460, 500, 588, 596),
         "carpet_a0_indep_f1280": (680, 520, 936, 712), "carpet_a0_fixed_f1280": (280, 500, 536, 692)}


def only(m, field):
    q = dict(m)
    if field in ("centre", "all"):
        q["X"] = m["X"].astype(np.float16).astype(np.float64)
    if field in ("scale", "all"):
        q["ls"] = -12.0 + np.clip(np.round((m["ls"] + 12.0) * 254 / 21.0), 0, 254) * 21.0 / 254
    if field in ("quat", "all"):
        q["q"] = oct88r8(m["q"])
    if field in ("colour_alpha", "all"):
        q["o"] = np.round(np.clip(m["o"] / 2, 0, 1) * 255) / 255 * 2
        q["packed"] = True
    return q


def main(dd, out_json):
    dd = Path(dd)
    views = {v["name"]: v for v in json.load(open(dd / "refs" / "views.json"))["views"]}
    res = {}
    gs = lambda im: 0.2126 * im[..., 2].astype(float) + 0.7152 * im[..., 1] + 0.0722 * im[..., 0]
    fb = lambda g: g - cv2.GaussianBlur(g, (0, 0), 1.5)
    for model in ("golden", "edge"):
        m = load_model(dd / f"{model}_export.ply")
        for vn, crop in CROPS.items():
            x0, y0, x1, y1 = crop
            ref = cv2.imread(str(dd / "refs" / f"ref_{vn}.png"))[y0:y1, x0:x1]
            s = fb(gs(ref))[6:-6, 6:-6]; s0 = s - s.mean()
            rec = {}
            for field in ("none", "centre", "scale", "quat", "colour_alpha", "all"):
                p = prepare(only(m, field) if field != "none" else m, views[vn], crop)
                im, _ = raster(p, crop, "spark")
                r = fb(gs(im))[6:-6, 6:-6]; r0 = r - r.mean()
                rec[field] = {"fineCoherentGain": round(float((r0 * s0).mean() / (s0 ** 2).mean()), 3),
                              "fineNcc": round(float((r0 * s0).mean() / (r0.std() * s0.std())), 3),
                              "fineEnergyRatio": round(float(r0.std() / s0.std()), 3),
                              "meanLumaMinusRef": round(float(gs(im).mean() - gs(ref).mean()), 2)}
            res[f"{model}/{vn}"] = rec
            print(model, vn, json.dumps(rec), flush=True)
    # size of the fp16 centre error in this scene, at the carpet
    X = load_model(dd / "golden_export.ply")["X"]
    err = np.abs(X.astype(np.float16).astype(np.float64) - X)
    res["fp16CentreErrorUnits_p50_p99_max"] = [float(np.percentile(err.max(1), 50)), float(np.percentile(err.max(1), 99)),
                                              float(err.max())]
    json.dump(res, open(out_json, "w"), indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:3])
