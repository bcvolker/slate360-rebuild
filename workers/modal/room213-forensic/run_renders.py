"""Render Official / A / A+ / AX6c at the SAME physical cameras (prep.json views, AX6c frame) via the deployed
official-release render path (cap_render.render_release_v2: v2026.9.24 `360-camera`, --init-ply, 0 iterations), then
sample each render on the target ortho grids. Usage: python run_renders.py <run>"""
import json, sys, numpy as np, modal
run = sys.argv[1]
AL = "../../../docs/ops/room213-capture-2026-09-29"
def sim(p): a = json.load(open(p))["cond_to_ref"]; return a["s"], np.array(a["R"]), np.array(a["t"])
sX, RX, tX = sim(f"{AL}/AX6c/AX6c_align.json")
def to_model(views, inv):                      # AX6c frame -> ref -> model (inv = model->ref similarity or None for ref)
    out = []
    for v in views:
        R, t = np.array(v["R"]), np.array(v["t"]); C = -R.T @ t
        Cr = sX * RX @ C + tX; Rr = R @ RX.T
        if inv: s, Rm, tm = inv; Cm = Rm.T @ (Cr - tm) / s; Rmm = Rr @ Rm
        else: Cm, Rmm = Cr, Rr
        out.append({**v, "R": Rmm.tolist(), "t": (-Rmm @ Cm).tolist()})
    return out
vol = modal.Volume.from_name("slate360-recon-experiments")
prep = json.loads(b"".join(vol.read_file(f"room213/2026-09-29/forensic/{run}/prep.json")))
views = prep["render_views"]
C = "/vol/room213/2026-09-29/capture/conditions"; PLY = "ws/outputs/ref/step-000030000.ckpt/splat.ply"
models = {"AX6c": (f"{C}/AX6c", None, "self"), "A": (f"{C}/A", sim(f"{AL}/A/A_align.json"), None),
          "Aplus": (f"{C}/Aplus", sim(f"{AL}/Aplus/Aplus_align.json"), None), "Official": ("/vol/room213/2026-09-29/ref", None, None)}
render = modal.Function.from_name("slate360-room213-capture-render", "render_release_v2")
calls = {}
for m, (root, inv, mode) in models.items():
    vv = views if mode == "self" else to_model(views, inv)
    calls[m] = render.spawn(f"{root}/{PLY}", f"{root}/ws/sparse/0", f"{root}/ws/images", vv, f"{run}_{m}")
res = {m: c.get() for m, c in calls.items()}
print(json.dumps({m: {k: r[k] for k in ("exit", "seconds", "rendered", "views")} for m, r in res.items()}, indent=1))
ortho = modal.Function.from_name("slate360-room213-forensic", "ortho_renders_v3")
print(json.dumps({m: ortho.remote(run, m) for m in models}, indent=1))
