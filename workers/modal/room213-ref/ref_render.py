"""Align the reference reconstruction to the golden frame (physically matched cameras) and render the REFERENCE model at
the locked comparison cameras + walkthrough poses with the official release (native render, 0 iterations, --init-ply).
Alignment: golden exposures carry (clip, t) (preflight/demux.json); reference frames are named by source frame index
(t = idx * 1001/30000). Same-instant pairs (|dt| <= 1 frame, tripod clip within its stable windows) give camera-centre
correspondences for a similarity golden->reference (Umeyama, trimmed). Rotations are checked for consistency.
Usage (deployed): ref_render.align_and_render.remote()"""
import modal

app = modal.App("slate360-room213-ref-render")
vol = modal.Volume.from_name("slate360-recon-experiments")
from ref_app import image as base_image, SP, WS, R, check_bin  # noqa: E402

image = base_image.pip_install("pycolmap==4.2.0", "scipy").add_local_file("ref_app.py", "/root/ref_app.py").add_local_dir("refs", "/root/refs")
GOLD_SPARSE = "/vol/room213/2026-09-21/fullcircle/data/room213/sparse/0"
DEMUX = "/vol/room213/2026-09-21/preflight/demux.json"
GOLD_DS = "/vol/room213/2026-09-21/spirula_bench_v1"
FPS = 30000 / 1001
STABLE = {1: (3.0, 17.0), 2: (23.0, 35.5), 3: (42.0, 52.5)}


def umeyama(A, B):
    import numpy as np
    ma, mb = A.mean(0), B.mean(0); X, Y = A - ma, B - mb
    U, S, Vt = np.linalg.svd(Y.T @ X); D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))]); Rm = U @ D @ Vt
    s = np.trace(np.diag(S) @ D) / (X ** 2).sum(); return s, Rm, mb - s * Rm @ ma


@app.function(image=image, gpu="L40S", cpu=16.0, memory=65536, timeout=4 * 3600, volumes={"/vol": vol})
def align_and_render_v2(ply_rel: str = "outputs/ref/step-000030000.ckpt/splat.ply") -> dict:
    import json, os, re, shutil, subprocess, time, numpy as np, pycolmap, cv2
    from pathlib import Path
    from scipy.spatial.transform import Rotation as Rot
    check_bin(); vol.reload(); out = {}
    gold = pycolmap.Reconstruction(GOLD_SPARSE); ref = pycolmap.Reconstruction(f"{WS}/sparse/0")
    demux = json.load(open(DEMUX)); exps = sorted({f"{d['video']}@{d['t']:.3f}" for d in demux}, key=lambda e: (e.split("@")[0], float(e.split("@")[1])))
    rank = {e: i for i, e in enumerate(exps)}
    gname = {}
    for d in demux:
        e = f"{d['video']}@{d['t']:.3f}"; gname[(d["video"][:-5], d["lens"], d["t"], d.get("placement"))] = f"camera{d['lens'] + 1}/frame_{rank[e]:05d}"
    gpose = {}
    for im in gold.images.values():
        c = im.cam_from_world(); gpose[im.name.replace("_test", "")[:-4]] = (np.asarray(c.rotation.matrix()), np.asarray(c.translation))
    rpose = {}
    for im in ref.images.values():
        m = re.match(r"(.+)/cam(\d)/(\d+)\.jpg", im.name)
        if m: c = im.cam_from_world(); rpose[(m[1], int(m[2]), int(m[3]))] = (np.asarray(c.rotation.matrix()), np.asarray(c.translation))
    pairs = []
    for (clip, lens, t, plc), gn in gname.items():
        if gn not in gpose: continue
        cands = [(abs(k[2] / FPS - t), k) for k in rpose if k[0] == clip and k[1] == lens]
        if not cands: continue
        dt, k = min(cands)
        tol = (STABLE[plc][1] - STABLE[plc][0]) if (plc and clip.endswith("_020")) else 1.01 / FPS
        if plc and clip.endswith("_020") and not (STABLE[plc][0] <= k[2] / FPS <= STABLE[plc][1]): continue
        if dt <= tol: pairs.append((gn, k, dt))
    Cg = np.array([-gpose[g][0].T @ gpose[g][1] for g, k, _ in pairs]); Cr = np.array([-rpose[k][0].T @ rpose[k][1] for g, k, _ in pairs])
    keep = np.ones(len(pairs), bool)
    for _ in range(5):
        s, Rm, t = umeyama(Cg[keep], Cr[keep]); res = np.linalg.norm((s * (Rm @ Cg.T)).T + t - Cr, axis=1)
        keep = res <= max(3 * np.median(res[keep]), 1e-6)
    s, Rm, t = umeyama(Cg[keep], Cr[keep]); res = np.linalg.norm((s * (Rm @ Cg.T)).T + t - Cr, axis=1)
    # ---- ICP refinement on sparse points (golden points with small error / long tracks vs the dense reference cloud)
    from scipy.spatial import cKDTree
    G = np.array([p.xyz for p in gold.points3D.values() if p.error < 1.5 and p.track.length() >= 4])
    Rpts = np.array([p.xyz for p in ref.points3D.values() if p.error < 1.5])
    tree = cKDTree(Rpts); icp_log = []
    for it, thr in enumerate([0.10, 0.06, 0.04, 0.03, 0.02, 0.02, 0.015, 0.015]):
        Gt = (s * (Rm @ G.T)).T + t; d, idx = tree.query(Gt, k=1); sel = d < thr
        s, Rm, t = umeyama(G[sel], Rpts[idx[sel]]); icp_log.append({"thr": thr, "n": int(sel.sum()), "median_d": float(np.median(d[sel]))})
    out["icp"] = icp_log
    res = np.linalg.norm((s * (Rm @ Cg.T)).T + t - Cr, axis=1)
    rot_err = [np.degrees(Rot.from_matrix(rpose[k][0] @ Rm @ gpose[g][0].T).magnitude()) for (g, k, _), kk in zip(pairs, keep) if kk]
    out["align_after_icp"] = None
    out["align"] = {"pairs": len(pairs), "inliers": int(keep.sum()), "scale_ref_per_golden_unit": float(s),
                    "centre_resid_ref_units_median": float(np.median(res[keep])), "centre_resid_p90": float(np.percentile(res[keep], 90)),
                    "rotation_disagreement_deg_median": float(np.median(rot_err)), "rotation_disagreement_deg_p90": float(np.percentile(rot_err, 90))}
    # ---- cameras to render (golden frame -> reference frame): Xr = s Rm Xg + t ; w2c_r: R' = Rg Rm^T, C' = s Rm Cg + t
    views = json.load(open("/root/refs/views.json"))["views"]
    def to_ref(Rw2c, C):
        R2 = Rw2c @ Rm.T; C2 = s * Rm @ C + t; return R2, -R2 @ C2
    cams = []
    for k, v in enumerate(views):
        Rc = np.array(v["c2w_R"]).T; C = np.array(v["C"]); cams.append((f"diag/v{k:03d}_{v['name']}_eval.png", *to_ref(Rc, C), 3 if v["f"] == 640 else 4))
    man = json.load(open(f"{GOLD_DS}/dataset_manifest.json"))
    for w in man["walk"]:
        Rc = np.array(w["c2w_R"]).T; C = np.array(w["C"]); cams.append((w["name"], *to_ref(Rc, C), 3))
    shutil.rmtree("/tmp/ev", ignore_errors=True); shutil.rmtree(f"{R}/eval/ref", ignore_errors=True)
    root = Path("/tmp/ev/dataset"); (root / "sparse/0").mkdir(parents=True)
    refcams = [l for l in open(f"{WS}/sparse/0/cameras.txt").read().splitlines() if l and not l.startswith("#")] if Path(f"{WS}/sparse/0/cameras.txt").is_file() else None
    if refcams is None:
        ref.write_text(str(root / "sparse/0")); refcams = [l for l in open(root / "sparse/0/cameras.txt").read().splitlines() if l and not l.startswith("#")]
    first = refcams[0].split()[0]
    cam_lines = [refcams[0], "3 PINHOLE 1280 720 640.0 640.0 640.0 360.0", "4 PINHOLE 1280 720 1280.0 1280.0 640.0 360.0"]
    if first in ("3", "4"): raise RuntimeError("camera id clash")
    (root / "sparse/0/cameras.txt").write_text("\n".join(cam_lines) + "\n")
    lines = []; iid = 1
    tr = [im for im in ref.images.values() if im.camera_id == int(first)][:2]
    for im in tr:
        c = im.cam_from_world(); q = Rot.from_matrix(np.asarray(c.rotation.matrix())).as_quat(); tt = np.asarray(c.translation)
        nm = "train/" + im.name.replace("/", "_").replace(".jpg", "_train.jpg")
        lines += [f"{iid} {float(q[3])!r} {float(q[0])!r} {float(q[1])!r} {float(q[2])!r} {float(tt[0])!r} {float(tt[1])!r} {float(tt[2])!r} {first} {nm}", ""]; iid += 1
        (root / "images/train").mkdir(parents=True, exist_ok=True); shutil.copyfile(f"{WS}/images/{im.name}", root / "images" / nm)
    for n, R2, tt, cid in cams:
        q = Rot.from_matrix(R2).as_quat()
        lines += [f"{iid} {float(q[3])!r} {float(q[0])!r} {float(q[1])!r} {float(q[2])!r} {float(tt[0])!r} {float(tt[1])!r} {float(tt[2])!r} {cid} {n}", ""]; iid += 1
        d = root / "images" / n; d.parent.mkdir(parents=True, exist_ok=True)
        if n.startswith("walk/"):
            k = int(n[7:12]); im = np.zeros((720, 1280, 3), np.uint8); im[..., 0] = k // 256; im[..., 1] = k % 256; im[..., 2] = 77; cv2.imwrite(str(d), im)
        else:
            shutil.copyfile(f"/root/refs/ref_{n.split('_', 1)[1][:-9]}.png", d)
    (root / "sparse/0/images.txt").write_text("\n".join(lines) + "\n")
    with open(root / "sparse/0/points3D.txt", "w") as f:
        for pid, p in list(ref.points3D.items())[:200000]:
            f.write(f"{pid} {float(p.xyz[0])!r} {float(p.xyz[1])!r} {float(p.xyz[2])!r} {int(p.color[0])} {int(p.color[1])} {int(p.color[2])} 0\n")
    gts = {n: str(root / "images" / n) for n, *_ in cams}
    ply = f"{WS}/{ply_rel}"; od = Path("/tmp/ev/ref")
    cmd = f"{SP} train 360-camera --data {root} --image-dir images --mask-dir masks --num-iterations 0 --init-ply {ply} " \
          f"--save-eval-images 1 --eval-mode filename --disable-viewer 1 --output-dir-prefix {od} --output-dir-name r --device 0"
    t1 = time.time(); r = subprocess.run(["bash", "-c", cmd], capture_output=True, text=True, timeout=3 * 3600)
    th = lambda im: cv2.resize(im, (48, 27), interpolation=cv2.INTER_AREA).astype(np.float32)
    ref_th = {n: th(cv2.imread(p)) for n, p in gts.items()}
    dest = Path(f"{R}/eval/ref"); mapping = {}
    for g in sorted((od / "r").glob("eval-gt-*.png")):
        tg = th(cv2.imread(str(g))); err, n = min((float(np.abs(tg - v).mean()), n) for n, v in ref_th.items())
        tgt = dest / n; tgt.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(str(g).replace("eval-gt-", "eval-render-"), tgt); mapping[n] = err
    wd = dest / "walk"
    if wd.is_dir():
        subprocess.run(["bash", "-c", f"ffmpeg -y -loglevel error -framerate 20 -i /vol/room213/2026-09-28/g1/eval/golden/walk/w_%05d_eval.png "
                        f"-framerate 20 -i {wd}/w_%05d_eval.png -filter_complex hstack=inputs=2 -c:v libx264 -crf 16 -pix_fmt yuv420p {R}/eval/walk_golden_left_ref_right.mp4"])
    out["render"] = {"exit": r.returncode, "seconds": round(time.time() - t1), "mapped": len(mapping), "max_thumb_err": max(mapping.values()) if mapping else None,
                     "log_tail": (r.stdout + r.stderr)[-3000:]}
    json.dump(out, open(f"{R}/render_result.json", "w"), indent=1); vol.commit()
    return out
