"""R213-LFS-IGS-1 NATIVE render: LichtFeld renders a trained PLY at arbitrary PINHOLE cameras with its own eval path.
LichtFeld has no headless still-image renderer (only an MP4 camera-path renderer), so: an eval-only dataset of the
requested cameras + `--init <ply>` + 3 iterations with EVERY learning rate 0 (and sh_degree_interval 1 so the active SH
degree climbs 0 -> 3, since --init resets it to 0) + `--eval-all --eval-steps 3`. The exported PLY after those 3 steps is
diffed against the input PLY to prove the model was not changed. Each eval PNG is [GT | render]; the GT half is a solid
colour that encodes the view index, so renders are mapped to views by content, not by file order.
Output: <renders_root>/<out_name>/<view>.png (the layout ortho_renders_v3 reads) + render_report.json."""
import modal
from lfs_build import COMMIT, image as build_image
from lfs_run import vol, TAR
image = (build_image.env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"})
         .pip_install("numpy", "opencv-python-headless==4.10.0.84", "pycolmap==3.11.1").add_local_python_source("lfs_build", "lfs_run"))

app = modal.App("slate360-lfs-render")
ZERO = {"means_lr": 0.0, "shs_lr": 0.0, "opacity_lr": 0.0, "scaling_lr": 0.0, "rotation_lr": 0.0, "sh_degree_interval": 1,
        "steps_scaler": 0, "enable_save_eval_images": True}


def _code(i):
    return (40 + (i % 8) * 25, 40 + ((i // 8) % 8) * 25, 40 + ((i // 64) % 8) * 25)


@app.function(image=image, gpu="L40S", cpu=8.0, memory=65536, timeout=3600, volumes={"/vol": vol}, retries=0)
def native_render_v2(ply: str, views: list, out_dir: str) -> dict:
    import json, os, shutil, struct, subprocess, numpy as np, cv2
    from pathlib import Path
    vol.reload(); Path(out_dir).mkdir(parents=True, exist_ok=True)
    subprocess.run(f"tar -C /root -I zstd -xf {TAR}", shell=True, check=True)
    src = "/root/LichtFeld-Studio"; exe = f"{src}/build-linux-release/LichtFeld-Studio"
    ds = Path("/root/evalds"); (ds / "images").mkdir(parents=True); (ds / "sparse/0").mkdir(parents=True)
    sizes = sorted({(v["W"], v["H"], v["f"]) for v in views}); cam_id = {s: i + 1 for i, s in enumerate(sizes)}
    with open(ds / "sparse/0/cameras.bin", "wb") as f:
        f.write(struct.pack("<Q", len(sizes)))
        for (W, H, fl), cid in cam_id.items():
            f.write(struct.pack("<iiQQ", cid, 1, W, H)); f.write(struct.pack("<4d", fl, fl, W / 2, H / 2))
    import pycolmap
    with open(ds / "sparse/0/images.bin", "wb") as f:
        f.write(struct.pack("<Q", len(views)))
        for i, v in enumerate(views):
            x, y, z, w = np.asarray(pycolmap.Rotation3d(np.array(v["R"], float)).quat)
            f.write(struct.pack("<i4d3di", i + 1, w, x, y, z, *v["t"], cam_id[(v["W"], v["H"], v["f"])]))
            f.write(f"v{i:04d}.jpg".encode() + b"\0"); f.write(struct.pack("<Q", 0))
            cv2.imwrite(str(ds / "images" / f"v{i:04d}.jpg"), np.full((v["H"], v["W"], 3), _code(i)[::-1], np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 100])
    with open(ds / "sparse/0/points3D.bin", "wb") as f:     # a few points; the model comes from --init
        f.write(struct.pack("<Q", 1)); f.write(struct.pack("<Q3d3Bd", 1, 0, 0, 0, 128, 128, 128, 0.0)); f.write(struct.pack("<Q", 0))
    cfg = json.load(open(f"{src}/eval/improvedGSplus_optimization_params.json")); cfg.update(ZERO)
    json.dump(cfg, open("/root/cfg.json", "w"))
    shutil.copy(ply, "/root/in.ply")
    cmd = [exe, "-d", str(ds), "-o", "/root/out", "--images", "images", "--config", "/root/cfg.json", "--headless", "--init", "/root/in.ply",
           "-i", "3", "--eval-all", "--eval-steps", "3", "-r", "1", "--max-width", "0", "--export", "ply"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    open(f"{out_dir}/render.log", "w").write(r.stdout + r.stderr)
    ev = Path("/root/out/eval_step_3"); done = {}
    for p in ev.glob("*.png"):
        if not p.stem.isdigit(): continue
        img = cv2.imread(str(p)); W = (img.shape[1] - 4) // 2
        c = img[:, :W].reshape(-1, 3).mean(0)[::-1]
        i = min(range(len(views)), key=lambda k: np.abs(np.array(_code(k)) - c).sum())
        cv2.imwrite(f"{out_dir}/{views[i]['name']}.png", img[:, W + 4:])
        done[views[i]["name"]] = p.name
    # the model must be unchanged by the 3 zero-LR steps
    def ply_arr(fn):
        b = open(fn, "rb").read(); h = b.index(b"end_header\n") + 11; hdr = b[:h].decode()
        n = int([l for l in hdr.splitlines() if l.startswith("element vertex")][0].split()[-1])
        props = [l.split()[-1] for l in hdr.splitlines() if l.startswith("property")]
        return np.frombuffer(b[h:h + n * 4 * len(props)], "<f4").reshape(n, len(props)), props
    outs = sorted(Path("/root/out").glob("*.ply"))
    a, pa = ply_arr("/root/in.ply"); b, pb = (ply_arr(str(outs[-1])) if outs else (None, None))
    same = None
    if b is not None and pa == pb and a.shape == b.shape:
        same = float(np.abs(a - b).max())
        if same > 0:   # tolerate a row permutation on export: compare after sorting rows by position
            ia, ib = np.lexsort(a[:, :3].T), np.lexsort(b[:, :3].T); same = float(np.abs(a[ia] - b[ib]).max())
    rep = {"commit": COMMIT, "exit": r.returncode, "views": len(views), "rendered": len(done), "missing": [v["name"] for v in views if v["name"] not in done],
           "ply_in_vs_after_max_abs_diff": same, "ply_props_equal": pa == pb, "log_tail": (r.stdout + r.stderr)[-1500:]}
    json.dump(rep, open(f"{out_dir}/render_report.json", "w"), indent=1); vol.commit()
    return rep
