"""Spirula v2026.9.24 'max_screen_size' value of the table-edge contributors in the frozen A model (no training).
Formula copied from src/generated/primitive_3dgs.cuh view_radius_3dgs_0:
  R = exp(max log_scale) * sqrt(2 ln(max(255*sigmoid(opacity), 1)));  screen = R / (max(d, R) + sqrt(max(d^2 - R^2, 0)))
The trainer keeps the max over the faces a splat lands in (projection_fwd.slang InterlockedMax), so the relevant value is the
nearest training camera that sees it. Views = the 34 training observers of T_table from prep_cp1 (A frame), plus every
camera centre in A's sparse model as a visibility-free upper bound.
Usage: python screen_size.py  (prints JSON)"""
import json, sys
import modal

app = modal.App("slate360-room213-screen-size")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = modal.Image.debian_slim(python_version="3.11").pip_install("numpy", "pycolmap==3.11.1")
A = "/vol/room213/2026-09-29/capture/conditions/A/ws"


@app.function(image=image, cpu=4.0, memory=16384, timeout=1800, volumes={"/vol": vol})
def screen_v1(X: list, observers: list, radii: list) -> dict:
    import numpy as np, pycolmap
    f = open(f"{A}/outputs/ref/step-000030000.ckpt/splat.ply", "rb"); hdr = b""
    while not hdr.endswith(b"end_header\n"): hdr += f.readline()
    lines = hdr.decode().splitlines(); n = int(next(l.split()[-1] for l in lines if l.startswith("element vertex")))
    props = [l.split()[-1] for l in lines if l.startswith("property")]
    a = np.frombuffer(f.read(n * 4 * len(props)), dtype="<f4").reshape(n, len(props)); col = {p: i for i, p in enumerate(props)}
    xyz = a[:, [col["x"], col["y"], col["z"]]].astype(np.float64)
    ls = a[:, [col["scale_0"], col["scale_1"], col["scale_2"]]].astype(np.float64)
    op = 1 / (1 + np.exp(-a[:, col["opacity"]].astype(np.float64)))
    R = np.exp(ls.max(1)) * np.sqrt(2 * np.log(np.maximum(255 * op, 1.0)))

    def screen(i, C):
        d = np.linalg.norm(xyz[i] - C[:, None, :], axis=2); r = R[i][None]
        return r / (np.maximum(d, r) + np.sqrt(np.maximum(d * d - r * r, 0)))

    rec = pycolmap.Reconstruction(f"{A}/sparse/0")
    allC = np.array([np.asarray(im.projection_center()) for im in rec.images.values()])
    obsC = np.array([o["C"] for o in observers]); close = np.array([o["dist_m"] < 1.05 for o in observers])
    d0 = np.linalg.norm(xyz - np.array(X), axis=1)
    out = {"n_total": int(n), "camera_centres": int(len(allC)), "observers": int(len(obsC)), "close_observers": int(close.sum())}
    for rad in radii:
        i = np.where((d0 < rad) & (op >= 0.05))[0]
        if len(i) == 0: out[f"r{int(rad*1000)}mm"] = None; continue
        s_obs = screen(i, obsC); s_close = s_obs[close]; s_all = screen(i, allC)
        out[f"r{int(rad*1000)}mm"] = {
            "contributors": int(len(i)),
            "R_extent_mm_p10_p50_p90_max": np.percentile(R[i] * 1000, [10, 50, 90, 100]).round(2).tolist(),
            "longest_sigma_mm_p50": float(np.median(np.exp(ls[i].max(1)) * 1000)),
            "opacity_p50": float(np.median(op[i])),
            "screen_close_views_p50_p90_max": np.percentile(s_close, [50, 90, 100]).round(4).tolist(),
            "screen_max_over_observers_per_splat_p50_max": np.percentile(s_obs.max(0), [50, 100]).round(4).tolist(),
            "screen_max_any_camera_centre_per_splat_p50_max": np.percentile(s_all.max(0), [50, 100]).round(4).tolist(),
            "frac_over_0p1_observers": float((s_obs.max(0) > 0.1).mean()),
            "frac_over_0p1_any_camera": float((s_all.max(0) > 0.1).mean()),
            "frac_over_0p05_any_camera": float((s_all.max(0) > 0.05).mean())}
    return out


if __name__ == "__main__":
    p = json.load(open("../../../docs/ops/room213-close-pass-2026-09-30/prep_cp1.json"))["targets"]["T_table"]
    obs = [{"C": o["C"], "dist_m": o["dist_m"]} for o in p["observations"]]
    with modal.enable_output():
        with app.run():
            print(json.dumps(screen_v1.remote(p["X"], obs, [0.015, 0.03, 0.06]), indent=1))
