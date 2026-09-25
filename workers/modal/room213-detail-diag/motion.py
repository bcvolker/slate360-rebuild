"""Short-motion stability check (no ground truth exists for translated cameras, so only temporal measures):
25 frames, camera translated 1.5 mm/frame along its own x axis around carpet_a0_indep (f=640). In a fixed carpet ROI:
  shimmer     = mean |F(k+1) - 2 F(k) + F(k-1)| of the fine band (sigma 0 - 1.5 px) / std of the fine band
                (a steady sub-pixel translation is nearly linear frame to frame; popping / aliasing / sort flips are not)
  frameDiff   = mean |F(k+1) - F(k)| / std(F)
  fineStd     = mean fine-band std (detail level during motion)
usage: python motion.py <dd dir> <out json>"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROI = (600, 400, 750, 530)      # f640 pixels, carpet (same as analyze.py carpet_a0_indep mapped to f640)


def seq_stats(frames):
    x0, y0, x1, y1 = ROI
    F = []
    for im in frames:
        g = (0.2126 * im[..., 2] + 0.7152 * im[..., 1] + 0.0722 * im[..., 0]).astype(np.float64)
        F.append((g - cv2.GaussianBlur(g, (0, 0), 1.5))[y0:y1, x0:x1])
    F = np.array(F)
    sd = float(F.std(axis=(1, 2)).mean())
    d2 = np.abs(F[2:] - 2 * F[1:-1] + F[:-2]).mean()
    d1 = np.abs(F[1:] - F[:-1]).mean()
    return {"frames": len(F), "shimmer2ndDiffOverStd": round(float(d2 / sd), 4), "frameDiffOverStd": round(float(d1 / sd), 4),
            "meanFineStd": round(sd, 3)}


def main(dd, out):
    dd = Path(dd)
    names = [v["name"] for v in json.load(open(dd / "motion" / "views.json"))["views"]]
    res = {"roiF640": ROI}
    for model in ("golden", "edge"):
        run = dd / "spirula_motion" / f"{model}_A"
        # eval order is shuffled by the eval DataManager: identify each render by its GT tag (fill value 10*k)
        byk = {}
        for p in run.glob("eval-gt-*.png"):
            k = int(round(cv2.imread(str(p))[0, 0, 0] / 10))
            byk[k] = run / p.name.replace("eval-gt-", "eval-render-")
        res[f"{model}_A_spirula"] = seq_stats([cv2.imread(str(byk[k])) for k in range(len(names))])
        for tag in ("C", "Cfilt"):
            fr = [cv2.imread(str(dd / "out_spark" / f"mot_{model}_{tag}__{n}.png")) for n in names]
            if all(f is not None for f in fr):
                res[f"{model}_{tag}_spark"] = seq_stats(fr)
        # side-by-side clip: Spirula | Spark product | Spark trainer-2D-filter check
        vid = dd / f"motion_{model}_A_C_Cfilt.mp4"
        w = cv2.VideoWriter(str(vid), cv2.VideoWriter_fourcc(*"mp4v"), 8, (3 * 300, 260))
        x0, y0, x1, y1 = ROI
        for k, n in enumerate(names):
            tiles = []
            for im in (cv2.imread(str(byk[k])), cv2.imread(str(dd / "out_spark" / f"mot_{model}_C__{n}.png")),
                       cv2.imread(str(dd / "out_spark" / f"mot_{model}_Cfilt__{n}.png"))):
                tiles.append(cv2.resize(im[y0:y1, x0:x1], (300, 260), interpolation=cv2.INTER_NEAREST))
            w.write(np.hstack(tiles))
        w.release()
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main(*sys.argv[1:3])
