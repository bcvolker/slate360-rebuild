"""Never-trained neighbour frames for the close-pass lineage (READ-ONLY). For each observation of a prep run, decode the
ORIGINAL .insv frames idx-2..idx+2 (PyAV, HEVC, lens track = cam index, as `sam extract` logged "track 0 -> cam0"),
apply the identical training-face warp (depends only on intrinsics + face index, not on pose), and save the crops.
idx itself is decoded too, to validate this decode path against Spirula's own extracted JPEG of that frame.
Only idx is in training; idx+-1/+-2 were never extracted (sam extract keeps 1 of every 15 source frames)."""
import modal

app = modal.App("slate360-room213-adjacent")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11").apt_install("libgl1", "libglib2.0-0t64")
         .pip_install("numpy", "opencv-python-headless", "pycolmap==4.2.0", "scipy", "av").add_local_python_source("forensic_geom"))
RAW = "/vol/room213/2026-09-29/capture/raw"; COND = "/vol/room213/2026-09-29/capture/conditions"; OUT = "/vol/room213/2026-09-29/forensic"


@app.function(image=image, cpu=8.0, memory=32768, timeout=3 * 3600, volumes={"/vol": vol})
def adjacent_v1(run: str, cond: str, groups: dict) -> dict:
    """groups: {target: [tags]} to process."""
    import json, collections
    from pathlib import Path
    import av, cv2, numpy as np, pycolmap
    from forensic_geom import face_pixels
    vol.reload(); P = json.load(open(f"{OUT}/{run}/prep.json")); WS = f"{COND}/{cond}/ws"; rec = pycolmap.Reconstruction(f"{WS}/sparse/0")
    jobs = collections.defaultdict(list)                    # (clip, track) -> [(idx, target, obs)]
    for tn, tags in groups.items():
        for o in P["targets"][tn]["observations"]:
            if o["tag"] not in tags: continue
            clip, cam, f = o["image"].split("/"); jobs[(clip, int(cam[-1]))].append((int(f[:-4]), tn, o))
    out = {}
    for (clip, track), items in jobs.items():
        want = sorted({i + d for i, _, _ in items for d in (-2, -1, 0, 1, 2)}); got = {}
        with av.open(f"{RAW}/{clip}.insv") as ctn:
            st = ctn.streams.video[track]; st.thread_type = "AUTO"; fps = float(st.average_rate); tb = float(st.time_base)
            for target in want:
                if target in got: continue
                ctn.seek(int(max(0, (target - 45) / fps) / tb), stream=st, backward=True, any_frame=False)
                for fr in ctn.decode(st):
                    n = int(round(fr.pts * tb * fps))
                    if n in want and n not in got: got[n] = fr.to_ndarray(format="rgb24")
                    if n >= target: break
        for idx, tn, o in items:
            im = rec.images[o["image_id"]]; cam = rec.cameras[im.camera_id]; u0, v0, u1, v1 = o["face_bbox"]
            D = Path(f"{OUT}/{run}/{tn}/adj"); D.mkdir(parents=True, exist_ok=True); rec_o = {}
            for d in (-2, -1, 0, 1, 2):
                if idx + d not in got: continue
                fc, _, _ = face_pixels(cam, got[idx + d], o["face"], u0, v0, u1 - u0, v1 - v0)
                np.save(D / f"{o['tag']}_d{d:+d}.npy", fc.astype(np.float32)); rec_o[d] = True
            ref = cv2.imread(f"{WS}/images/{o['image']}")[..., ::-1]           # Spirula's extracted JPEG of idx
            fr_ref, _, _ = face_pixels(cam, ref, o["face"], u0, v0, u1 - u0, v1 - v0)
            if 0 in rec_o:
                a = cv2.cvtColor(np.load(D / f"{o['tag']}_d+0.npy"), cv2.COLOR_RGB2GRAY); b = cv2.cvtColor(fr_ref.astype(np.float32), cv2.COLOR_RGB2GRAY)
                hp = lambda x: x - cv2.GaussianBlur(x, (0, 0), 2.0)
                rec_o["validate_ncc_fine"] = float(np.corrcoef(hp(a).ravel(), hp(b).ravel())[0, 1]); rec_o["validate_mean_abs_255"] = float(np.abs(a - b).mean() * 255)
            out[f"{tn}/{o['tag']}"] = rec_o
    vol.commit()
    return out
