"""Viewer-fidelity follow-up: per-view + mean table of the four Spark conditions vs Spirula (A) and the source,
from analyze.py's measurements.json, the harness info files (effective settings, load/frame time, accumulator
bytes) and the 25-frame motion renders.

usage: python fidelity_summary.py <dd dir> <measurements.json> <out.json> <out.md>"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from motion import seq_stats  # noqa: E402

CONDS = ["baseline", "ext", "blur0", "combined"]
CARPET = ["carpet_a0_indep", "carpet_a3_indep", "carpet_a0_fixed"]


def main(dd, meas, out_json, out_md):
    dd = Path(dd)
    r = json.load(open(meas))["views"]
    imap = json.load(open(dd / "spirula" / "index_map.json"))
    res = {"perView": {}, "mean": {}, "edges": {}, "motion": {}, "runtime": {}}
    md = []
    for model in ("golden", "edge"):
        rows = {}
        for f in (640, 1280):
            for t in CARPET:
                name = f"{t}_f{f}"
                v = r[name]
                x0, y0, x1, y1 = v["carpetRoi"]
                spA = cv2.imread(str(dd / "spirula" / f"{model}_A" / f"eval-render-{imap[model + '_A'][name]:05d}.png"))
                valid = cv2.imread(str(dd / "refs" / f"valid_{name}.png"), 0) > 127
                m = np.zeros_like(valid); m[y0:y1, x0:x1] = True
                m &= cv2.erode(valid.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
                for lab in [f"{model}_A"] + [f"{model}_{c}" for c in CONDS]:
                    c = v["carpet"][lab]
                    im = spA if lab.endswith("_A") else cv2.imread(str(dd / "out_spark" / f"v2_{lab}__{name}.png"))
                    rec = {"fineGain": c["fine"]["coherentGain"], "fineNcc": c["fine"]["ncc"],
                           "fineIncoherent": c["fine"]["incoherentRatio"], "fineEnergy": c["fine"]["energyRatio"],
                           "midGain": c["mid"]["coherentGain"], "midNcc": c["mid"]["ncc"],
                           "rgbMinusSource": float(np.mean(c["meanRgbMinusRef"])),
                           "lumaMinusSpirula": float((im[m].astype(float) - spA[m].astype(float)).mean()),
                           "baseboardPx": v["edges"]["baseboard_top"][lab]["width10_90px"]}
                    rows.setdefault(lab, {})[name] = rec
        for lab, per in rows.items():
            res["perView"][lab] = per
            for f in (640, 1280):
                vals = [per[f"{t}_f{f}"] for t in CARPET]
                res["mean"].setdefault(lab, {})[f"f{f}"] = {k: round(float(np.mean([x[k] for x in vals])), 3) for k in vals[0]}
        for f in (640, 1280):
            ch = r[f"chair_slats_a2_fixed_f{f}"]["edges"]["chair_back_top"]
            res["edges"].setdefault(f"f{f}", {})["source"] = round(ch["source"]["width10_90px"], 2)
            for lab in [f"{model}_A"] + [f"{model}_{c}" for c in CONDS]:
                res["edges"][f"f{f}"][lab] = round(ch[lab]["width10_90px"], 2)
        # motion
        names = [v["name"] for v in json.load(open(dd / "motion" / "views.json"))["views"]]
        run = dd / "spirula_motion" / f"{model}_A"
        byk = {}
        for p in run.glob("eval-gt-*.png"):
            byk[int(round(cv2.imread(str(p))[0, 0, 0] / 10))] = run / p.name.replace("eval-gt-", "eval-render-")
        res["motion"][f"{model}_A"] = seq_stats([cv2.imread(str(byk[k])) for k in range(len(names))])
        for c in CONDS:
            res["motion"][f"{model}_{c}"] = seq_stats([cv2.imread(str(dd / "out_spark" / f"v2mot_{model}_{c}__{n}.png")) for n in names])
            info = json.load(open(dd / "out_spark" / f"v2_{model}_{c}__info.json"))
            res["runtime"][f"{model}_{c}"] = {"loadMs": round(info["loadMs"]), "effective": info["effective"],
                                               "accumulatorBytes": info["accumulatorBytesTotal"],
                                               "accumulators": info["accumulators"],
                                               "activeSplats": [fr["activeSplats"] for fr in info["frames"]]}
    json.dump(res, open(out_json, "w"), indent=1)
    # markdown tables
    for model in ("golden", "edge"):
        for f in (640, 1280):
            md.append(f"\n**{model}, f={f}** — per view (a0_indep / a3_indep / a0_fixed) and mean\n")
            md.append("| stage | fine coherent gain | fine NCC | fine incoherent | mid gain | luma − Spirula | RGB − source | baseboard px |")
            md.append("|---|---|---|---|---|---|---|---|")
            for lab in [f"{model}_A"] + [f"{model}_{c}" for c in CONDS]:
                per = res["perView"][lab]; mean = res["mean"][lab][f"f{f}"]
                cell = lambda k, fmt: " / ".join(fmt.format(per[f"{t}_f{f}"][k]) for t in CARPET) + f" (**{fmt.format(mean[k])}**)"
                name = "Spirula A" if lab.endswith("_A") else lab.split("_", 1)[1]
                md.append(f"| {name} | {cell('fineGain', '{:.2f}')} | {cell('fineNcc', '{:.3f}')} | {cell('fineIncoherent', '{:.2f}')} | "
                          f"{cell('midGain', '{:.2f}')} | {cell('lumaMinusSpirula', '{:+.1f}')} | {cell('rgbMinusSource', '{:+.1f}')} | {cell('baseboardPx', '{:.2f}')} |")
    open(out_md, "w", encoding="utf-8").write("\n".join(md) + "\n")
    print("\n".join(md))
    print(json.dumps({"edges": res["edges"], "motion": res["motion"]}, indent=1))
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk in ("loadMs", "accumulatorBytes")} for k, v in res["runtime"].items()}, indent=1))


if __name__ == "__main__":
    main(*sys.argv[1:5])
