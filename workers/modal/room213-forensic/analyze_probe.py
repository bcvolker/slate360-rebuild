"""Analyse densification dumps (densify_probe.py): for the table-edge and cable Gaussian sets, at each dumped refinement
event -- score (accum_buffer lane 0), global percentile among live splats, opacity, longest world scale, view radius,
parent selection (params changed across the draw while alive), children created nearby, local count; plus the
expected number of parent draws for the set (score share x total draws) vs the observed.
Usage: python analyze_probe.py <dumps dir> <targets json {name: [x,y,z]} in A world frame> <out json>"""
import json, sys, glob, re
from pathlib import Path
import numpy as np

D, TJ, OUTJ = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
T = {k: np.array(v) for k, v in json.load(open(TJ)).items()}
MIN_OP = 0.005; RADII = (0.015, 0.03)


def load(p):
    b = open(p, "rb").read(); n, step = np.frombuffer(b[:16], dtype="<i8"); n = int(n); o = 16
    def take(k):
        nonlocal o; a = np.frombuffer(b[o:o + 4 * n * k], dtype="<f4").reshape(n, k) if k > 1 else np.frombuffer(b[o:o + 4 * n], dtype="<f4"); o += 4 * n * k; return a
    return {"n": n, "step": int(step), "means": take(3), "logscale": take(3), "oplogit": take(1), "radii": take(1), "accum": take(2)}


def sig(x): return 1 / (1 + np.exp(-x))


steps = sorted({int(re.search(r"step(\d+)_", p).group(1)) for p in glob.glob(str(D / "step*_pre.bin"))})
res = {"steps": {}}
for s in steps:
    pre, post = load(D / f"step{s}_pre.bin"), load(D / f"step{s}_post.bin"); n = pre["n"]
    op = sig(pre["oplogit"]); alive = op >= MIN_OP; score = pre["accum"][:, 0].astype(np.float64)
    live = alive & (score > 0); ranks = np.empty(n); order = np.argsort(score[live]); rk = np.empty(live.sum()); rk[order] = np.arange(live.sum()) / max(1, live.sum() - 1)
    ranks[:] = np.nan; ranks[np.where(live)[0]] = rk
    changed = np.any(np.abs(pre["means"] - post["means"][:n]) > 1e-7, 1) | np.any(np.abs(pre["logscale"] - post["logscale"][:n]) > 1e-6, 1) | (np.abs(pre["oplogit"] - post["oplogit"][:n]) > 1e-6)
    parents = changed & alive; relocated_dst = changed & ~alive; appended = np.arange(post["n"]) >= n
    n_dead = int((~alive).sum()); n_draws = int(parents.sum())
    tot_score = score[live].sum()
    row = {"n_pre": n, "n_post": post["n"], "dead_pre": n_dead, "parents_observed": n_draws, "relocated_into_dead_slots": int(relocated_dst.sum()), "appended": int(appended.sum()),
           "score_live_p50_p90_p99": np.percentile(score[live], [50, 90, 99]).tolist(), "sets": {}}
    for name, X in T.items():
        for r in RADII:
            d = np.linalg.norm(pre["means"] - X, axis=1); m = d < r
            md = np.linalg.norm(post["means"] - X, axis=1) < r
            new_near = md & (np.concatenate([relocated_dst, np.zeros(post["n"] - n, bool)]) | appended)
            sc = score[m & live]
            row["sets"][f"{name}_r{int(r * 1000)}mm"] = {
                "count_pre": int(m.sum()), "count_post": int(md.sum()), "alive": int((m & alive).sum()),
                "score_p50": float(np.median(sc)) if len(sc) else None, "score_max": float(sc.max()) if len(sc) else None,
                "rank_pct_p50": float(np.nanmedian(ranks[m & live]) * 100) if len(sc) else None, "rank_pct_max": float(np.nanmax(ranks[m & live]) * 100) if len(sc) else None,
                "opacity_p50": float(np.median(op[m])) if m.any() else None,
                "longest_scale_mm_p10_p50": (np.percentile(np.exp(pre["logscale"][m]).max(1) * 1000, [10, 50]).round(2).tolist()) if m.any() else None,
                "radius_px_p50": float(np.median(pre["radii"][m])) if m.any() else None,
                "parents_observed": int((m & parents).sum()), "expected_parent_draws": float(score[m & live].sum() / tot_score * n_draws) if tot_score > 0 else None,
                "children_created_near": int(new_near.sum())}
    res["steps"][s] = row
json.dump(res, open(OUTJ, "w"), indent=1)
for s, row in res["steps"].items():
    print(f"step {s}: n {row['n_pre']}->{row['n_post']}, dead {row['dead_pre']}, parents {row['parents_observed']}, relocated {row['relocated_into_dead_slots']}, appended {row['appended']}, live score p50/p90/p99 {np.round(row['score_live_p50_p90_p99'], 4).tolist()}")
    for k, v in row["sets"].items():
        if k.endswith("30mm") or k.endswith("15mm"):
            print(f"   {k:22s} n {v['count_pre']:3d}->{v['count_post']:3d}  rank p50 {v['rank_pct_p50'] if v['rank_pct_p50'] is None else round(v['rank_pct_p50'], 1)}%  max {v['rank_pct_max'] if v['rank_pct_max'] is None else round(v['rank_pct_max'], 1)}%  "
                  f"op {v['opacity_p50'] if v['opacity_p50'] is None else round(v['opacity_p50'], 2)}  long {v['longest_scale_mm_p10_p50']}  rad {v['radius_px_p50']}  parents {v['parents_observed']} (exp {v['expected_parent_draws'] if v['expected_parent_draws'] is None else round(v['expected_parent_draws'], 2)})  children {v['children_created_near']}")
