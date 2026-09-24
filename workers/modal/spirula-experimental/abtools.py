"""Room 213 quality A/B tooling (projection test, capacity test). Uses the hardened worker's job/dataset machinery;
adds no training path of its own except bounded probes (--max-steps) that never produce accepted artifacts."""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import time
from pathlib import Path

import numpy as np


def _dump(binary, job, data: Path, work: Path) -> dict:
    from jobspec import build_command
    dump = work / "dump.json"
    cmd = build_command(binary, job, str(data), str(work), "dumprun")
    r = subprocess.run(cmd, env={**os.environ, "SS_DUMP_CAMERAS": str(dump), "SS_SPLIT_LOG": "1"},
                       capture_output=True, text=True, timeout=1800, cwd="/tmp")
    if not dump.is_file():
        raise RuntimeError("camera dump not produced: " + (r.stdout + r.stderr)[-1500:])
    split_log = [l for l in (r.stdout + r.stderr).splitlines() if l.startswith("[split]")]
    return {"dump": json.loads(dump.read_text()), "splitLog": split_log}


def warp_camera_check(binary, job_warp, data: Path, work: Path, golden_dump: dict) -> dict:
    """Every perspective face must keep its parent camera's centre (no new SfM, no pose change) and differ from it by
    a rotation that is identical for that face index across all parents (a fixed face axis)."""
    d = _dump(binary, job_warp, data, work)
    w = d["dump"]; g = golden_dump
    if w["num_cameras"] != g["num_cameras"] or w["image_filenames"] != g["image_filenames"] and \
            [x.split("/dataset/")[-1] for x in w["image_filenames"]] != [x.split("/dataset/")[-1] for x in g["image_filenames"]]:
        raise RuntimeError("parent camera set differs from the golden import")
    if w["c2w"] != g["c2w"]:
        diff = float(np.abs(np.array(w["c2w"]) - np.array(g["c2w"])).max())
        if diff > 1e-6:
            raise RuntimeError(f"parent c2w differs from golden by {diff}")
    N = w["num_cameras"]; P = np.array(w["c2w"]).reshape(N, 3, 4)
    V = np.array(w["viewmats"]).reshape(w["n_post"], 4, 4)
    K = w["K_per_camera"]; off = w["post_offsets"]
    centre_err, rel = 0.0, {}
    for i in range(N):
        Cp = P[i, :, 3]
        for k in range(K[i]):
            Rw2c, t = V[off[i] + k, :3, :3], V[off[i] + k, :3, 3]
            C = -Rw2c.T @ t
            centre_err = max(centre_err, float(np.abs(C - Cp).max()))
            Rc2w = Rw2c.T
            rel.setdefault(k, []).append(P[i, :, :3].T @ Rc2w)     # parent-frame face rotation
    face_spread = {k: float(max(np.abs(r - r_list[0]).max() for r in r_list)) for k, r_list in rel.items()}
    ortho = max(float(np.abs(r.T @ r - np.eye(3)).max()) for r_list in rel.values() for r in r_list)
    return {"parents": N, "postCameras": w["n_post"], "facesPerParent": sorted(set(K)),
            "maxCentreErrorVsParent": centre_err, "faceRotationSpreadAcrossParents": face_spread,
            "maxOrthonormalityError": ortho, "trainFrameScale": w["train_frame_scale"], "numPoints": w["num_points"],
            "splitLog": d["splitLog"], "postWidths": sorted(set(w["widths"])) if "widths" in w else None,
            "inheritsPoses": centre_err < 1e-4 and max(face_spread.values()) < 1e-4 and ortho < 1e-4}


def _gpu_mem_sampler(stop, out):
    peak = 0
    while not stop.is_set():
        try:
            v = subprocess.check_output(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
                                        text=True).strip().splitlines()
            peak = max(peak, int(v[0]))
        except Exception:  # noqa: BLE001
            pass
        time.sleep(2)
    out["peakVramMiB"] = peak


def throughput_probe(binary, job, data: Path, work: Path, max_steps: int, limit_s: int) -> dict:
    """Bounded probe: the job's exact flags (recipe untouched); the process group is stopped as soon as Spirula's own
    log reports step >= max_steps (--max-steps is the LR horizon in this revision, not a stop)."""
    from jobspec import build_command
    cmd = build_command(binary, job, str(data), str(work), "probe")
    log = work / "probe.log"
    stop = threading.Event(); mem = {}
    th = threading.Thread(target=_gpu_mem_sampler, args=(stop, mem), daemon=True); th.start()
    t0 = time.time()
    with log.open("w") as f:
        p = subprocess.Popen(cmd, stdout=f, stderr=subprocess.STDOUT, cwd="/tmp", start_new_session=True)
        while p.poll() is None and time.time() - t0 < limit_s:
            time.sleep(2)
            last = parse_timeline(log.read_text(errors="replace")[-4000:])
            if last and last[-1][0] >= max_steps:
                break
        if p.poll() is None:
            import signal
            os.killpg(p.pid, signal.SIGKILL); p.wait()
    stop.set(); th.join()
    txt = log.read_text(errors="replace")
    steps = [(int(m.group(1)), int(m.group(2)), _hms(m.group(3)))
             for m in re.finditer(r"step\s+(\d+)/\d+\s+\(\s*\d+%\)\s+splats\s+(\d+)\s+\[elapsed ([\d:.]+)", txt)]
    return {"exit": p.returncode, "wallS": round(time.time() - t0, 1), "steps": steps[::5] + steps[-1:],
            "peakVramMiB": mem.get("peakVramMiB"), "cameraLine": [l for l in txt.splitlines() if l.startswith("Cameras:")],
            "tail": txt[-800:]}


def _hms(s: str) -> float:
    h, m, sec = s.split(":")
    return int(h) * 3600 + int(m) * 60 + float(sec)


def parse_timeline(txt: str) -> list:
    return [(int(m.group(1)), int(m.group(2)), _hms(m.group(3)))
            for m in re.finditer(r"step\s+(\d+)/\d+\s+\(\s*\d+%\)\s+splats\s+(\d+)\s+\[elapsed ([\d:.]+)", txt)]


def native_rerender(binary, native_job, data: Path, work: Path, ckpt_dir: Path, cap: str, iters: str) -> dict:
    """Render a FINISHED model at the native fisheye eval cameras: Spirula --resume on the terminal checkpoint with the
    native (warp 0) dataset flags and the model's own cap/iterations, so no step is trained and no layout adapts; the
    eval pass then renders all 838 eval views (24 holdout + 14 fixed + 800 walkthrough) exactly as the golden run did."""
    from jobspec import build_command
    job = json.loads(json.dumps(native_job))
    job["flags"] = [[n, cap if n == "--cap-max" else iters if n == "--num-iterations" else v] for n, v in job["flags"]]
    cmd = build_command(binary, job, str(data), str(work), "nrender", resume=str(ckpt_dir))
    log = work / "nrender.log"
    with log.open("w") as f:
        r = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, cwd="/tmp", timeout=3 * 3600)
    txt = log.read_text(errors="replace")
    ok = {"exit": r.returncode, "resumed": bool(re.search(r"Resumed from \S+ at step " + iters, txt)),
          "adapted": "Checkpoint layout differs" in txt, "evalWritten": "Eval metrics written" in txt,
          "trainedSteps": len(re.findall(r"^step\s+\d+/", txt, re.M)), "tail": txt[-1500:]}
    return ok
