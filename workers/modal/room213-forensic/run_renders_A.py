"""Render A (own frame) and A+ (A -> ref -> A+ via the verified similarities) at the SAME physical cameras listed in a
prep.json made in A's frame (official release render path, --init-ply, 0 iterations), then sample on the target grids.
Usage: python run_renders_A.py <run>"""
import json, sys, numpy as np, modal
run = sys.argv[1]; AL = "../../../docs/ops/room213-capture-2026-09-29"
def sim(p): a = json.load(open(p))["cond_to_ref"]; return a["s"], np.array(a["R"]), np.array(a["t"])
sA, RA, tA = sim(f"{AL}/A/A_align.json"); sP, RP, tP = sim(f"{AL}/Aplus/Aplus_align.json")
def a_to_aplus(views):
    out = []
    for v in views:
        R, t = np.array(v["R"]), np.array(v["t"]); C = -R.T @ t
        Cr = sA * RA @ C + tA; Rr = R @ RA.T; Cm = RP.T @ (Cr - tP) / sP; Rm = Rr @ RP
        out.append({**v, "R": Rm.tolist(), "t": (-Rm @ Cm).tolist()})
    return out
vol = modal.Volume.from_name("slate360-recon-experiments")
views = json.loads(b"".join(vol.read_file(f"room213/2026-09-29/forensic/{run}/prep.json")))["render_views"]
C = "/vol/room213/2026-09-29/capture/conditions"; PLY = "ws/outputs/ref/step-000030000.ckpt/splat.ply"
render = modal.Function.from_name("slate360-room213-capture-render", "render_release_v2")
calls = {"A": render.spawn(f"{C}/A/{PLY}", f"{C}/A/ws/sparse/0", f"{C}/A/ws/images", views, f"{run}_A"),
         "Aplus": render.spawn(f"{C}/Aplus/{PLY}", f"{C}/Aplus/ws/sparse/0", f"{C}/Aplus/ws/images", a_to_aplus(views), f"{run}_Aplus")}
print(json.dumps({m: {k: v for k, v in c.get().items() if k != "log_tail"} for m, c in calls.items()}))
ortho = modal.Function.from_name("slate360-room213-forensic", "ortho_renders_v3")
print(json.dumps({m: ortho.remote(run, m) for m in ("A", "Aplus")}))
