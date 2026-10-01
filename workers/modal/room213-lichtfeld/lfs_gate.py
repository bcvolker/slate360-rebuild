"""R213-LFS-IGS-1 conversion gate (no training). Checks the exported dataset before any LichtFeld run:
 1. counts / names / dimensions: 5,080 JPEG faces + 5,080 PNG masks, all 1718x1718, names == images.bin;
 2. mask semantics: white = train; agrees with the forensic `mask_valid` of every T_table observation; border 0;
 3. round-trip reprojection: A's seed points through (A pose -> face axes -> f=c=859) vs through the WRITTEN COLMAP files
    read back by pycolmap; gate <= 0.05 px (conversion fidelity only);
 4. export-level pixel fidelity on the table faces: float face (Spirula path) vs the written JPEG, LSB stats + edge widths.
Usage: python lfs_gate.py  (prints + writes conditions/LFS_IGS1/gate_report.json)"""
import json
import modal
from lfs_export import image as exp_image, A, OUT, FISH_AXES, S, F, stb_load, face_maps, bilinear, _cfw

app = modal.App("slate360-lfs-gate")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = exp_image.add_local_python_source("lfs_export", "edgekit")


def _dims(path):
    import struct
    b = open(path, "rb").read(65536)
    if b[:8] == b"\x89PNG\r\n\x1a\n": return struct.unpack(">II", b[16:24])
    i = 2
    while i < len(b):
        if b[i] != 0xFF: i += 1; continue
        m = b[i + 1]
        if m in (0xC0, 0xC1, 0xC2): h, w = struct.unpack(">HH", b[i + 5:i + 9]); return (w, h)
        i += 2 + struct.unpack(">H", b[i + 2:i + 4])[0]
    return None


@app.function(image=image, cpu=16.0, memory=65536, timeout=3600, volumes={"/vol": vol})
def gate_v1(table_obs: list, X: list) -> dict:
    import os, cv2, numpy as np, pycolmap
    from multiprocessing import Pool
    from edgekit import gray, edge_points, profile, pos_width
    vol.reload(); rep = {}
    idx = json.load(open(f"{OUT}/face_index.json")); names = [r["name"] for r in idx]
    imgs = sorted(os.listdir(f"{OUT}/images")); msks = sorted(os.listdir(f"{OUT}/masks"))
    with Pool(16) as p:
        di = p.map(_dims, [f"{OUT}/images/{n}" for n in imgs], chunksize=64); dm = p.map(_dims, [f"{OUT}/masks/{n}" for n in msks], chunksize=64)
    rep["counts"] = {"images.bin": len(names), "jpg": len(imgs), "png": len(msks), "names_match": sorted(names) == imgs,
                     "masks_match": sorted(n[:-4] + ".png" for n in names) == msks,
                     "jpg_all_1718": all(tuple(d) == (S, S) for d in di), "png_all_1718": all(tuple(d) == (S, S) for d in dm)}
    # ---- round trip: A poses vs the written COLMAP read back ----
    recA = pycolmap.Reconstruction(f"{A}/sparse/0"); recL = pycolmap.Reconstruction(f"{OUT}/sparse/0")
    camL = next(iter(recL.cameras.values())); rep["camera"] = {"model": str(camL.model), "w": camL.width, "h": camL.height, "params": list(camL.params)}
    byname = {im.name: im for im in recA.images.values()}; L = {im.name: im for im in recL.images.values()}
    xyz = np.array([p.xyz for p in recA.points3D.values()]); rep["points3D"] = {"A": len(recA.points3D), "written": len(recL.points3D)}
    rng = np.random.default_rng(0); pick = [r for r in idx if any(r["src"] == o["image"] and r["face"] == o["face"] for o in table_obs)]
    pick += [idx[i] for i in rng.choice(len(idx), 20, replace=False)]
    errs = []
    for r in pick:
        im = byname[r["src"]]; cw = _cfw(im); M = np.array(FISH_AXES[r["face"]], float)
        q = (M @ (xyz @ np.asarray(cw.rotation.matrix()).T + np.asarray(cw.translation)).T).T
        ok = q[:, 2] > 0.05; pa = np.stack([F * q[ok, 0] / q[ok, 2] + F, F * q[ok, 1] / q[ok, 2] + F], 1)
        inside = (pa >= 0).all(1) & (pa < S).all(1)
        imL = L[r["name"]]; cwL = _cfw(imL)
        qL = xyz[ok][inside] @ np.asarray(cwL.rotation.matrix()).T + np.asarray(cwL.translation)
        fx, fy, cx, cy = list(camL.params); pb = np.stack([fx * qL[:, 0] / qL[:, 2] + cx, fy * qL[:, 1] / qL[:, 2] + cy], 1)
        if len(pb): errs.append(float(np.abs(pb - pa[inside]).max()))
    rep["roundtrip_px"] = {"faces": len(errs), "max": max(errs), "median_of_face_max": float(np.median(errs)), "gate_0p05": max(errs) <= 0.05}
    # ---- masks: semantics vs forensic observations + border ----
    sem = []
    for o in table_obs:
        stem = o["image"].replace("/", "_").rsplit(".", 1)[0]; m = cv2.imread(f"{OUT}/masks/{stem}_f{o['face']}.png", 0)
        u, v = o["face_px"]; sem.append({"tag": o["tag"], "mask_valid_forensic": o["mask_valid"], "export_at_target": int(m[int(v), int(u)]),
                                         "agree": bool(o["mask_valid"]) == (m[int(v), int(u)] == 255), "values": sorted(np.unique(m).tolist())})
    side = cv2.imread(f"{OUT}/masks/{idx[1]['name'][:-4]}.png", 0)
    rep["mask"] = {"table_obs": len(sem), "agree_all": all(s["agree"] for s in sem), "binary_0_255": all(set(s["values"]) <= {0, 255} for s in sem),
                   "side_face_far_edge_zero": bool(side[:, -20:].max() == 0 or side[-20:, :].max() == 0), "detail": sem}
    # ---- export-level pixel fidelity on the 4 close table faces ----
    cam_maps = {}; fid = []
    for o in [o for o in table_obs if o["dist_m"] < 1.05]:
        im = byname[o["image"]]; cam = recA.cameras[im.camera_id]
        if im.camera_id not in cam_maps: cam_maps[im.camera_id] = face_maps(list(cam.params))
        X_, Y_, _ = cam_maps[im.camera_id][o["face"]]; u0, v0, u1, v1 = o["face_bbox"]
        src = stb_load(f"{A}/images/{o['image']}", cam.width, cam.height, 3)
        ref = bilinear(src, X_[v0:v1, u0:u1], Y_[v0:v1, u0:u1]).astype(np.float32)
        stem = o["image"].replace("/", "_").rsplit(".", 1)[0]
        jp = cv2.imread(f"{OUT}/images/{stem}_f{o['face']}.jpg")[v0:v1, u0:u1, ::-1].astype(np.float32) / 255.0
        d = np.abs(jp - ref) * 255; g0, g1 = gray(ref), gray(jp); m = np.ones(g0.shape, bool); m[:10] = m[-10:] = False; m[:, :10] = m[:, -10:] = False
        w0, w1 = [], []
        for (y, x, dd) in edge_points(g0, m):
            a, b = pos_width(profile(g0, y, x, dd)), pos_width(profile(g1, y, x, dd))
            if a and b: w0.append(a[1]); w1.append(b[1])
        fid.append({"tag": o["tag"], "lsb_max": float(d.max()), "lsb_mean": float(d.mean()), "psnr_db": float(10 * np.log10(1 / max(((jp - ref) ** 2).mean(), 1e-12))),
                    "edges": len(w0), "width_ref_px": float(np.median(w0)), "width_jpeg_px": float(np.median(w1))})
    rep["export_fidelity_table_close"] = fid
    json.dump(rep, open(f"{OUT}/../gate_report.json", "w"), indent=1, default=lambda o: o.item()); vol.commit()
    return rep


if __name__ == "__main__":
    p = json.load(open("../../../docs/ops/room213-close-pass-2026-09-30/prep_cp1.json"))["targets"]["T_table"]
    obs = [{k: o[k] for k in ("image", "face", "face_px", "face_bbox", "mask_valid", "tag", "dist_m")} for o in p["observations"] if not o.get("pano")]
    with modal.enable_output():
        with app.run():
            print(json.dumps(gate_v1.remote(obs, p["X"]), indent=1, default=lambda o: o.item()))


@app.function(image=image, cpu=16.0, memory=32768, timeout=3600, volumes={"/vol": vol})
def maskstats_v1() -> dict:
    """Coverage of the exported masks per face slot (white = train) and the backward band of side faces (should be 0)."""
    import os, cv2, numpy as np
    from multiprocessing import Pool
    names = sorted(os.listdir(f"{OUT}/masks"))
    with Pool(16) as p: st = p.map(_mstat, names, chunksize=32)
    out = {}
    for k in range(5):
        v = [s for n, s in zip(names, st) if n.endswith(f"_f{k}.png")]
        out[f"f{k}"] = {"n": len(v), "white_frac_p5_p50_p95": np.percentile([s[0] for s in v], [5, 50, 95]).round(3).tolist(),
                        "backward_band_white_max": float(max(s[1] for s in v))}
    json.dump(out, open(f"{OUT}/../mask_stats.json", "w"), indent=1)
    vol.commit(); return out


def _mstat(n):
    import cv2, numpy as np
    m = cv2.imread(f"{OUT}/masks/{n}", 0) > 127; k = int(n[-5])
    # backward band (theta > 120 deg) per side face: face pixel rows/cols whose ray has negative source-z beyond tan(30 deg)
    band = {1: m[:200, :], 2: m[:200, :], 3: m[:200, :], 4: m[:200, :]}.get(k)
    return float(m.mean()), float(band.mean()) if band is not None else 0.0


@app.function(image=image, cpu=8.0, memory=32768, timeout=1800, volumes={"/vol": vol})
def loaded_fidelity_v1(table_obs: list, eval_dir: str) -> dict:
    """Item 4: the GT that LichtFeld itself loaded (left half of its eval PNG = GT*mask after its JPEG cache + nvJPEG
    decode) vs A's float training face (Spirula path), on the T_table window of each close view."""
    import os, cv2, numpy as np, pycolmap
    from edgekit import gray, edge_points, profile, pos_width
    vol.reload(); recA = pycolmap.Reconstruction(f"{A}/sparse/0"); byname = {im.name: im for im in recA.images.values()}
    evs = sorted(os.listdir(eval_dir), key=lambda n: int(n.split(".")[0]) if n.split(".")[0].isdigit() else 1e9)
    evs = [n for n in evs if n.split(".")[0].isdigit()]
    lefts = {n: cv2.imread(f"{eval_dir}/{n}")[:, :S, ::-1] for n in evs}
    out = []; maps = {}
    for o in [o for o in table_obs if o["dist_m"] < 1.05]:
        stem = o["image"].replace("/", "_").rsplit(".", 1)[0]; jp = cv2.imread(f"{OUT}/images/{stem}_f{o['face']}.jpg")[..., ::-1]
        best = min(lefts, key=lambda n: np.abs(lefts[n][::8, ::8].astype(np.int16) - jp[::8, ::8]).mean())
        L = lefts[best].astype(np.float32) / 255.0
        im = byname[o["image"]]; cam = recA.cameras[im.camera_id]
        if im.camera_id not in maps: maps[im.camera_id] = face_maps(list(cam.params))
        X_, Y_, _ = maps[im.camera_id][o["face"]]; u0, v0, u1, v1 = o["face_bbox"]
        ref = bilinear(stb_load(f"{A}/images/{o['image']}", cam.width, cam.height, 3), X_[v0:v1, u0:u1], Y_[v0:v1, u0:u1]).astype(np.float32)
        ld = L[v0:v1, u0:u1]; d = np.abs(ld - ref) * 255
        g0, g1 = gray(ref), gray(ld); m = np.ones(g0.shape, bool); m[:10] = m[-10:] = False; m[:, :10] = m[:, -10:] = False
        w0, w1 = [], []
        for (y, x, dd) in edge_points(g0, m):
            a, b = pos_width(profile(g0, y, x, dd)), pos_width(profile(g1, y, x, dd))
            if a and b: w0.append(a[1]); w1.append(b[1])
        out.append({"tag": o["tag"], "eval_png": best, "match_mean_lsb_vs_export_jpeg": float(np.abs(lefts[best].astype(np.int16) - jp).mean()),
                    "lsb_max": float(d.max()), "lsb_mean": float(d.mean()), "psnr_db": float(10 * np.log10(1 / max(((ld - ref) ** 2).mean(), 1e-12))),
                    "edges": len(w0), "width_A_face_px": float(np.median(w0)), "width_loaded_px": float(np.median(w1)),
                    "width_ratio": float(np.median(w1) / np.median(w0))})
    json.dump(out, open(f"{OUT}/../loaded_fidelity.json", "w"), indent=1, default=lambda o: o.item()); vol.commit()
    return {"close_faces": out}
