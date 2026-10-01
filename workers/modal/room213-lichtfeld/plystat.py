import modal
app = modal.App("slate360-lfs-plystat"); vol = modal.Volume.from_name("slate360-recon-experiments")
@app.function(image=modal.Image.debian_slim().pip_install("numpy"), volumes={"/vol": vol}, cpu=4, memory=16384, timeout=900)
def stat(path):
    import numpy as np
    b = open(path, "rb").read(); h = b.index(b"end_header\n") + 11; hdr = b[:h].decode()
    n = int([l for l in hdr.splitlines() if l.startswith("element vertex")][0].split()[-1]); props = [l.split()[-1] for l in hdr.splitlines() if l.startswith("property")]
    a = np.frombuffer(b[h:h + n * 4 * len(props)], "<f4").reshape(n, len(props)); c = {p: i for i, p in enumerate(props)}
    xyz = a[:, [c["x"], c["y"], c["z"]]]; s = np.exp(a[:, [c["scale_0"], c["scale_1"], c["scale_2"]]]).max(1); op = 1 / (1 + np.exp(-a[:, c["opacity"]]))
    dc = a[:, [c["f_dc_0"], c["f_dc_1"], c["f_dc_2"]]]
    return {"n": n, "props": props[:20], "finite": bool(np.isfinite(a).all()), "xyz_p1_p50_p99": np.percentile(xyz, [1, 50, 99], axis=0).round(2).tolist(),
            "scale_max_m_p50_p99_max": np.percentile(s, [50, 99, 100]).round(4).tolist(), "n_scale_gt_1m": int((s > 1).sum()), "n_scale_gt_0p3m": int((s > 0.3).sum()),
            "opacity_p10_p50_p90": np.percentile(op, [10, 50, 90]).round(3).tolist(), "n_opacity_gt_0p5": int((op > 0.5).sum()),
            "big_and_opaque(>0.3m,>0.3)": int(((s > 0.3) & (op > 0.3)).sum()), "dc_p50": np.median(dc, 0).round(3).tolist()}
