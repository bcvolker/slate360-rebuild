"""Render the Adense model at the SAME physical cameras as the close-pass lineage run (views stored in A's frame).
A->Adense similarity from the shared A images (camera centres, Umeyama; both SfMs contain every A image), then the
official release render path (--init-ply, 0 iterations) and the same ortho sampling. Usage: python run_renders_dense.py <run> <cond>"""
import json, sys, io, numpy as np, modal
run, cond = sys.argv[1], sys.argv[2]
vol = modal.Volume.from_name("slate360-recon-experiments")
C = "/vol/room213/2026-09-29/capture/conditions"; PLY = "ws/outputs/ref/step-000030000.ckpt/splat.ply"


app = modal.App("slate360-room213-dense-sim")


@app.function(image=modal.Image.debian_slim(python_version="3.13").pip_install("numpy", "pycolmap==4.2.0"),
                                                volumes={"/vol": vol}, serialized=True, timeout=1200)
def similarity(cond: str) -> dict:
    import numpy as np, pycolmap
    a = pycolmap.Reconstruction(f"{C}/A/ws/sparse/0"); b = pycolmap.Reconstruction(f"{C}/{cond}/ws/sparse/0")
    ca = {i.name: np.asarray(i.projection_center()) for i in a.images.values()}; cb = {i.name: np.asarray(i.projection_center()) for i in b.images.values()}
    k = sorted(set(ca) & set(cb)); A = np.array([ca[x] for x in k]); B = np.array([cb[x] for x in k])
    ma, mb = A.mean(0), B.mean(0); U, S, Vt = np.linalg.svd((B - mb).T @ (A - ma)); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    R = U @ D @ Vt; s = float(np.trace(np.diag(S) @ D) / ((A - ma) ** 2).sum()); t = mb - s * R @ ma
    res = np.linalg.norm((s * (R @ A.T)).T + t - B, axis=1)
    return {"s": s, "R": R.tolist(), "t": t.tolist(), "n_shared": len(k), "resid_mm_median": float(np.median(res) * 1000), "resid_mm_p95": float(np.percentile(res, 95) * 1000),
            "images_registered": len(b.images)}


if __name__ == "__main__":
    with app.run():
        sim = similarity.remote(cond)
    print(json.dumps({k: v for k, v in sim.items() if k not in ("R", "t")}))
    s, R, t = sim["s"], np.array(sim["R"]), np.array(sim["t"])
    views = json.loads(b"".join(vol.read_file(f"room213/2026-09-29/forensic/{run}/prep.json")))["render_views"]; out = []
    for v in views:
        Rv, tv = np.array(v["R"]), np.array(v["t"]); Cw = -Rv.T @ tv; Cb = s * R @ Cw + t; Rb = Rv @ R.T
        out.append({**v, "R": Rb.tolist(), "t": (-Rb @ Cb).tolist()})
    r = modal.Function.from_name("slate360-room213-capture-render", "render_release_v2").remote(f"{C}/{cond}/{PLY}", f"{C}/{cond}/ws/sparse/0", f"{C}/{cond}/ws/images", out, f"{run}_{cond}")
    print(json.dumps({k: v for k, v in r.items() if k != "log_tail"}))
    print(json.dumps(modal.Function.from_name("slate360-room213-forensic", "ortho_renders_v3").remote(run, cond)))
    json.dump(sim, open(f"sim_A_to_{cond}.json", "w"), indent=1)
