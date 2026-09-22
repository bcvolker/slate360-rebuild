"""Room 213 raw-rig Stage-1 (the ONE authorized run) + frozen evaluation. Cloud side, L40S.

Training: K6/Splatfacto recipe via exp6.build_train_cmd (ARM_K6: 20k steps, no late prune),
unchanged except the two dataparser flags strictly required to load this input as built:
`nerfstudio-data --downscale-factor 1 --eval-mode filename`. Camera optimizer is off by
default in the recipe. Output dir is ON the volume so checkpoints persist; on relaunch the
newest verified step-*.ckpt is passed as --load-dir (never restart from step 0 silently).
Status: /vol/room213/2026-09-21/status.json every 5 min (step, gaussians, elapsed, cost, ETA).

Evaluation (frozen, see ROOM213_RAW_RIG_APPEARANCE_ACCEPTANCE_2026-09-21.md): ns-eval on the
frozen holdout (PSNR/SSIM/LPIPS), renders of every holdout face (ns-render dataset --split
test), pixel-exact feature crops raw-rig render | GT face, and contact sheets against the K6
historical GT-vs-render panels. No PASS is declared automatically: HUMAN_VISUAL_VERDICT stays
UNREVIEWED; the run is scored FAIL automatically only on hard instability signals.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

VOL = Path("/vol"); BASE = VOL / "room213" / "2026-09-21"
DATA = BASE / "build" / "dataset"; S1 = BASE / "stage1"; TRAIN = S1 / "train"; STATUS = BASE / "status.json"
LAB = Path("/root/splat-lab"); WRAP = LAB / "ns_train_wrap.py"

sys.path.insert(0, "/root/recon-experiment"); sys.path.insert(0, str(LAB))
import exp3  # noqa: E402
import exp6  # noqa: E402
from train_arm_exp3 import run_ns_train, dump_scalars, hash_kept_checkpoints  # noqa: E402
from opacity_stats import ckpt_step  # noqa: E402
from eval_arm import export_ply_at, run_ns_eval  # noqa: E402
from experiment import HOURLY_USD  # noqa: E402


def log(*a):
    print(*a, flush=True)


def write_status(**kw):
    try:
        base = json.loads(STATUS.read_text()) if STATUS.is_file() else {}
    except Exception:  # noqa: BLE001
        base = {}
    base.update({"timestamp_utc": datetime.now(timezone.utc).isoformat(), "phase": "stage1", **kw})
    STATUS.write_text(json.dumps(base, indent=1))


def latest_checkpoint() -> tuple[Path | None, int]:
    best = (None, -1)
    for p in TRAIN.rglob("step-*.ckpt"):
        s = ckpt_step(p)
        if s is not None and s > best[1] and p.stat().st_size > 1_000_000:
            best = (p, s)
    return best


def main():
    S1.mkdir(parents=True, exist_ok=True); TRAIN.mkdir(parents=True, exist_ok=True)
    total = exp6.TOTAL_STEPS
    ckpt, step0 = latest_checkpoint()
    if ckpt is not None and step0 >= total - 1 and (S1 / "train-result.json").is_file():
        log("training already complete at step", step0); result = json.loads((S1 / "train-result.json").read_text())
    else:
        cmd = exp6.build_train_cmd(python=sys.executable, wrap=WRAP, data_dir=DATA, out_dir=TRAIN, arm=exp6.ARM_K6)
        # strictly required to load this input as built (2560 faces, frozen holdout by filename)
        cmd += ["nerfstudio-data", "--downscale-factor", "1", "--eval-mode", "filename"]
        if ckpt is not None:
            # resume from a verified checkpoint: nerfstudio loads model+optimizers+step from --load-dir
            idx = cmd.index("nerfstudio-data")
            cmd[idx:idx] = ["--load-dir", str(ckpt.parent), "--load-step", str(step0)]
            log("RESUME from verified checkpoint", ckpt, "step", step0)
        (S1 / "train-cmd.json").write_text(json.dumps(cmd, indent=1))
        env = dict(os.environ)
        env.update({"SPLAT_LAB_EXP3": "1", "EXP3_STATUS_DIR": str(S1), "EXP3_MAX_LIVE_GAUSSIANS": str(exp3.MAX_LIVE_GAUSSIANS),
                    "SPLAT_LAB_WRAP_STATUS_PATH": str(S1 / "wrap-status.json"), "SPLAT_LAB_EXP6_SCALE_TRACK_STEPS": "16000,18000,19999"})
        t0 = time.time(); stop = threading.Event()

        def status_loop():
            while not stop.wait(300):
                try:
                    hist = json.loads((TRAIN / "gaussian-count.json").read_text()) if (TRAIN / "gaussian-count.json").is_file() else []
                    last = hist[-1] if hist else {}
                    step = last.get("step", step0 if ckpt else 0); el = time.time() - t0
                    rate = (step - (step0 if ckpt else 0)) / el if el > 60 and step > (step0 if ckpt else 0) else None
                    write_status(stage="training", step=step, total_steps=total, gaussians=last.get("gaussians"), elapsed_s=round(el),
                                 cost_usd=round(el / 3600 * HOURLY_USD, 3), eta_s_measured=(round((total - step) / rate) if rate else None),
                                 resumed_from_step=(step0 if ckpt else None), job_id=os.environ.get("MODAL_TASK_ID", "?"))
                except Exception as e:  # noqa: BLE001
                    log("status loop", e)
        threading.Thread(target=status_loop, daemon=True).start()
        write_status(stage="training", step=step0 if ckpt else 0, total_steps=total, resumed_from_step=(step0 if ckpt else None))
        train = run_ns_train(cmd, TRAIN, S1 / "ns-train.log", env)
        stop.set()
        result = {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd", "swept_checkpoints")}
        result["resumed_from_step"] = step0 if ckpt else None
        (S1 / "train-result.json").write_text(json.dumps(result, indent=1))
        log("TRAIN", json.dumps(result))
        if train["exit_code"] != 0 or train.get("abort") or train["step"] < total - 1:
            write_status(stage="training_failed", last_error=f"exit {train['exit_code']} abort {train.get('abort')} step {train['step']}")
            raise RuntimeError(f"training did not complete: exit {train['exit_code']} abort {train.get('abort')} step {train['step']}")
    # ---------------- frozen evaluation ----------------
    write_status(stage="evaluation")
    ev = S1 / "eval"; ev.mkdir(exist_ok=True)
    final = total - 1
    metrics = run_ns_eval(TRAIN, final, ev / f"metrics-{final}.json")  # eval split = frozen holdout (eval-mode filename)
    dump_scalars(TRAIN, ev / "scalar-logs.json"); hashes = hash_kept_checkpoints(TRAIN, ev / "checkpoint-hashes.json")
    exp_ = export_ply_at(TRAIN, final, S1 / "export")
    # holdout renders (all test faces) via nerfstudio's own renderer, identical camera model to training
    cfg = next(TRAIN.rglob("config.yml"), None)
    rend = ev / "holdout-renders"; rend.mkdir(exist_ok=True)
    if cfg is not None:
        r = subprocess.run(["ns-render", "dataset", "--load-config", str(cfg), "--output-path", str(rend), "--split", "test", "--rendered-output-names", "rgb"],
                           capture_output=True, text=True, timeout=3600)
        (ev / "ns-render.log").write_text(r.stdout[-20000:] + "\n" + r.stderr[-20000:])
        log("RENDER holdout exit", r.returncode)
    # feature crops: raw-rig render | GT face for the front faces of holdout exposures; K6 historical panels alongside
    try:
        import cv2
        import numpy as np
        sys.path.insert(0, "/root/recon-experiment")
        tj = json.load(open(DATA / "transforms.json")); tests = tj["test_filenames"]
        sheets = ev / "feature-sheets"; sheets.mkdir(exist_ok=True)
        rendered = {p.name: p for p in rend.rglob("*.png")} | {p.name: p for p in rend.rglob("*.jpg")}
        def lapvar(a):
            a = a.astype(np.float32); L = (-4 * a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1))[2:-2, 2:-2]; return float(L.var())
        rows = []
        for fp in tests:
            name = Path(fp).name
            cand = [p for n, p in rendered.items() if Path(n).stem == Path(name).stem or n.startswith(Path(name).stem)]
            if not cand: continue
            gt = cv2.imread(str(DATA / fp)); rr = cv2.imread(str(cand[0]))
            if gt is None or rr is None: continue
            if rr.shape != gt.shape: rr = cv2.resize(rr, (gt.shape[1], gt.shape[0]), interpolation=cv2.INTER_NEAREST)
            c = (880, 880, 1680, 1680); g1 = gt[c[1]:c[3], c[0]:c[2]]; r1 = rr[c[1]:c[3], c[0]:c[2]]
            sheet = np.hstack([g1, r1]); cv2.putText(sheet, "GT face", (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2); cv2.putText(sheet, "raw-rig Stage 1", (808, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            cv2.imwrite(str(sheets / f"{Path(name).stem}_centre.png"), sheet)
            rows.append({"face": name, "gt_lapvar": lapvar(cv2.cvtColor(g1, cv2.COLOR_BGR2GRAY)), "render_lapvar": lapvar(cv2.cvtColor(r1, cv2.COLOR_BGR2GRAY))})
        json.dump(rows, open(ev / "feature-crops.json", "w"), indent=1)
        log("FEATURE SHEETS", len(rows))
    except Exception as e:  # noqa: BLE001
        log("feature sheets failed", e)
    # automatic hard-fail signals only (haze/instability): population + scale tail from the exp6 instrumentation
    snaps = []
    if (S1 / "ns-train.log").is_file():
        for line in (S1 / "ns-train.log").read_text(errors="replace").splitlines():
            if line.startswith("EXP6_SCALE_SNAPSHOT "):
                snaps.append(json.loads(line[len("EXP6_SCALE_SNAPSHOT "):]))
    summary = {"train": result, "holdout_metrics": metrics.get("metrics") if isinstance(metrics, dict) else metrics, "export": {k: exp_.get(k) for k in ("ok", "ply_sha256", "step")},
               "scale_snapshots": snaps, "kept_checkpoints": [h.get("step") for h in hashes], "HUMAN_VISUAL_VERDICT": "UNREVIEWED",
               "auto_hard_fail": None}
    if snaps:
        last = snaps[-1]; k6_ref = 507199  # K6 final population
        if last.get("total_gaussian_count", 0) > 3 * k6_ref or last.get("count_above_0.15", 0) > 5000:
            summary["auto_hard_fail"] = f"population/scale-tail instability: {last}"
    (S1 / "stage1-summary.json").write_text(json.dumps(summary, indent=1))
    write_status(stage="finished_stage1", holdout=summary["holdout_metrics"], auto_hard_fail=summary["auto_hard_fail"])
    log("STAGE1 DONE", json.dumps(summary)[:1200])


if __name__ == "__main__":
    main()
