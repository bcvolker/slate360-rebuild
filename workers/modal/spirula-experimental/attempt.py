"""One training attempt of a logical run. Platform-independent (Modal wiring lives in worker.py) so the same path is
exercised by the fixture resume proof and by Room 213.

prepare: ids -> job manifest (hash) -> hardware == job -> lease -> cost ledger -> dataset materialize + exhaustive
fidelity -> Spirula camera dump vs golden (when the job carries one) -> durable-checkpoint discovery (resume)
train:   exact command; poll loop enforces runtime, renews the lease, checks the resolved config the moment Spirula
         writes it, ships every periodic checkpoint to R2 with a fresh-read verification
finish:  ledger -> strict gate (gate.final_acceptance) -> COMPLETED + terminal status, or a non-terminal status."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from pathlib import Path

from cost_guard import Ledger, assert_allowed
from gate import GateRejected, final_acceptance, normalized_config_sha
from ids import check_id
from inventory import InventoryRejected, build_inventory, upload_inventory, verify_remote
from jobspec import JobRejected, build_command, compare_camera_dump, load_job, materialize, verify_fidelity
from runlock import LockRefused, R2Store, RunLock
from train_run import run_trainer

RUN_NAME = "run"


class AttemptError(RuntimeError):
    pass


class Ctx:
    def __init__(self, *, s3, bucket, root, binary, hw, call_id, is_call_finished, work: Path, store=None):
        self.s3 = s3; self.bucket = bucket; self.root = root.rstrip("/"); self.binary = binary; self.hw = hw
        self.call_id = call_id; self.is_call_finished = is_call_finished; self.work = work
        self.store = store or R2Store(s3, bucket)


def _status(ctx, run_id, attempt_id, status, **extra):
    body = {"runId": run_id, "attemptId": attempt_id, "status": status, "utc": time.time(), **extra}
    ctx.s3.put_object(Bucket=ctx.bucket, Key=f"{ctx.root}/runs/{run_id}/attempts/{attempt_id}/status.json",
                      Body=json.dumps(body, indent=1, default=str).encode(), ContentType="application/json")
    return body


def _diagnostics(ctx, run_id, attempt_id, work: Path) -> dict:
    """Preserve evidence for any non-completed outcome: the full trainer log (real exit code + crash report), every
    PLY header and a listing of the run dir. Written under attempts/<attempt>/diagnostics/; never read by the gate."""
    pre = f"{ctx.root}/runs/{run_id}/attempts/{attempt_id}/diagnostics"
    out = {"prefix": pre, "files": []}
    try:
        if (work / "train.log").is_file():
            ctx.s3.upload_file(str(work / "train.log"), ctx.bucket, f"{pre}/train.log"); out["files"].append("train.log")
        listing, headers = [], {}
        for p in sorted((work / RUN_NAME).rglob("*")) if (work / RUN_NAME).exists() else []:
            if p.is_file():
                listing.append({"path": p.relative_to(work).as_posix(), "bytes": p.stat().st_size})
                if p.suffix == ".ply":
                    raw = p.open("rb").read(16384)
                    headers[p.relative_to(work).as_posix()] = raw[:raw.find(b"end_header")].decode("ascii", "replace")
        ctx.s3.put_object(Bucket=ctx.bucket, Key=f"{pre}/run_listing.json",
                          Body=json.dumps({"files": listing, "plyHeaders": headers}, indent=1).encode())
        out["files"].append("run_listing.json")
    except Exception as exc:  # noqa: BLE001 - diagnostics must never mask the real outcome
        out["error"] = str(exc)[:300]
    return out


def _durable_checkpoints(ctx, run_id) -> list[int]:
    pre = f"{ctx.root}/runs/{run_id}/ckpts/"
    steps = set(); token = None
    while True:
        kw = {"Bucket": ctx.bucket, "Prefix": pre}
        if token:
            kw["ContinuationToken"] = token
        r = ctx.s3.list_objects_v2(**kw)
        for it in r.get("Contents", []):
            if it["Key"].endswith("/ckpt.json"):
                steps.add(int(it["Key"][len(pre):].split("/")[0][5:]))
        if not r.get("IsTruncated"):
            break
        token = r["NextContinuationToken"]
    return sorted(steps)


def _fetch_checkpoint(ctx, job, run_id, step, run_dir: Path) -> dict:
    """Download a durable checkpoint and prove it belongs to this job before letting Spirula resume it."""
    pre = f"{ctx.root}/runs/{run_id}/ckpts/step-{step:09d}"
    rec = json.loads(ctx.s3.get_object(Bucket=ctx.bucket, Key=f"{pre}/ckpt.json")["Body"].read())
    for k in ("datasetSha256", "jobManifestSha256", "spirulaSha", "binarySha256", "backend", "resolvedConfigSha256"):
        want = job["expectedResolvedConfigSha256"] if k == "resolvedConfigSha256" else job.get(k, ctx.hw.get(k))
        if k == "backend":
            want = "cuda"
        if rec.get(k) != want:
            raise AttemptError(f"durable checkpoint {step} incompatible: {k} differs")
    if rec.get("step") != step:
        raise AttemptError("durable checkpoint record step mismatch")
    for it in rec["inventory"]["items"]:
        dest = run_dir / it["path"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        body = ctx.s3.get_object(Bucket=ctx.bucket, Key=f"{pre}/{it['path']}")["Body"].read()
        import hashlib
        if len(body) != it["bytes"] or hashlib.sha256(body).hexdigest() != it["sha256"]:
            raise AttemptError(f"durable checkpoint file {it['path']} does not match its record")
        dest.write_bytes(body)
    from gate import parse_state_tar
    st = parse_state_tar(run_dir / f"step-{step:09d}.ckpt" / "state.tar")
    if st["step"] != step:
        raise AttemptError(f"state.tar says step {st['step']}, record says {step}")
    return rec


def _ship_checkpoint(ctx, job, attempt, run_dir: Path, ck: Path, cfg_sha: str) -> int:
    step = int(ck.name[5:14])
    files = [(f"{ck.name}/state.tar", "ckpt-state", step), (f"{ck.name}/splat.ply", "ckpt-ply", step),
             ("config.json", "resolved-config", None)]
    inv = build_inventory(run_dir, files, job["runId"], attempt["attemptId"])
    pre = f"{ctx.root}/runs/{job['runId']}/ckpts/step-{step:09d}"
    upload_inventory(ctx.s3, ctx.bucket, pre, run_dir, inv)
    verify_remote(ctx.s3, ctx.bucket, pre, inv, {"ckpt-state", "ckpt-ply", "resolved-config"})
    rec = {"step": step, "inventory": inv, "datasetSha256": job["datasetSha256"],
           "jobManifestSha256": job["jobManifestSha256"], "spirulaSha": job["spirulaSha"],
           "binarySha256": job["binarySha256"], "backend": "cuda", "resolvedConfigSha256": cfg_sha,
           "attemptId": attempt["attemptId"]}
    ctx.s3.put_object(Bucket=ctx.bucket, Key=f"{pre}/ckpt.json", Body=json.dumps(rec).encode())   # pointer written LAST
    return step


def run_attempt(ctx: Ctx, job_key: str, job_sha: str, attempt_id: str, inject_interrupt_after_step: int = 0,
                approval: str | None = None) -> dict:
    """Never raises after a status can be written: any failure becomes status `failed` (non-terminal for the run;
    no automatic retry is ever scheduled)."""
    try:
        return _run_attempt(ctx, job_key, job_sha, attempt_id, inject_interrupt_after_step, approval)
    except LockRefused as exc:
        # Refused launches write NOTHING under the attempt: the id may belong to a live owner.
        return {"attemptId": attempt_id, "status": "refused", "reason": str(exc)}
    except Exception as exc:  # noqa: BLE001
        run_id = attempt_id.rsplit("-a", 1)[0]
        try:
            check_id(run_id, "runId"); check_id(attempt_id, "attemptId")
        except Exception:  # noqa: BLE001
            raise exc
        return _status(ctx, run_id, attempt_id, "failed", reason=f"{type(exc).__name__}: {str(exc)[:500]}",
                       diagnostics=_diagnostics(ctx, run_id, attempt_id, ctx.work))


def _run_attempt(ctx: Ctx, job_key: str, job_sha: str, attempt_id: str, inject_interrupt_after_step: int,
                 approval: str | None) -> dict:
    t_start = time.time()
    job = load_job(ctx.s3.get_object(Bucket=ctx.bucket, Key=job_key)["Body"].read(), job_sha)
    job["datasetSha256"] = job["dataset"]["datasetSha256"]
    run_id = job["runId"]; check_id(attempt_id, "attemptId")
    if not attempt_id.startswith(run_id + "-a"):
        raise AttemptError("attempt id must be <runId>-aNN")
    job["attemptId"] = attempt_id
    for k in ("spirulaSha", "binarySha256"):
        if ctx.hw[k] != job[k]:
            raise AttemptError(f"image {k} {ctx.hw[k][:12]} != job {job[k][:12]}")
    if ctx.hw["backend"] != "cuda" or job["gpu"] not in ctx.hw["gpuName"]:
        raise AttemptError(f"hardware {ctx.hw['gpuName']} / {ctx.hw['backend']} does not match job {job['gpu']}")
    lock = RunLock(ctx.store, ctx.root, run_id, attempt_id, ctx.call_id, ctx.is_call_finished)
    lease = lock.acquire()
    ledger = Ledger(ctx.s3, ctx.bucket, f"{ctx.root}/runs/{run_id}/ledger.json")
    cost = assert_allowed(job["gpu"], float(job["expectedMinutes"]), approval, ledger.load())
    _status(ctx, run_id, attempt_id, "preparing", lease=lease, cost=cost)
    work = ctx.work
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    data = work / "dataset"; run_dir = work / RUN_NAME
    man = materialize(ctx.s3, ctx.bucket, job, data)
    fidelity = verify_fidelity(data, man)
    (work / "fidelity.json").write_text(json.dumps(fidelity, indent=1))
    extra = [("fidelity.json", "fidelity-report", None)]
    if job.get("cameraDump"):
        ref = job["cameraDump"]
        raw = ctx.s3.get_object(Bucket=ctx.bucket, Key=ref["key"])["Body"].read()
        import hashlib
        if hashlib.sha256(raw).hexdigest() != ref["sha256"]:
            raise AttemptError("golden camera dump bytes do not match the job")
        dump_path = work / "camera_dump.json"
        dump_cmd = build_command(ctx.binary, job, str(data), str(work), "dumprun")
        subprocess.run(dump_cmd, env={**os.environ, "SS_DUMP_CAMERAS": str(dump_path)},
                       capture_output=True, text=True, timeout=1800, cwd="/tmp")
        if not dump_path.is_file():
            raise AttemptError("Spirula camera dump was not produced")
        chk = compare_camera_dump(json.loads(dump_path.read_text()), json.loads(raw), str(data), ref["goldenDataRoot"])
        (work / "camera_dump_check.json").write_text(json.dumps(chk, indent=1))
        extra += [("camera_dump_check.json", "camera-dump-check", None), ("camera_dump.json", "camera-dump", None)]
        shutil.rmtree(work / "dumprun", ignore_errors=True)
    durable = _durable_checkpoints(ctx, run_id)
    T = int(job["terminalStep"])
    resume_step = None; resume_arg = None
    if durable:
        from pin import RESUME_SUPPORTED
        if not RESUME_SUPPORTED and not os.environ.get("SPIRULA_ALLOW_BROKEN_RESUME_FOR_EVIDENCE"):
            raise AttemptError(f"durable checkpoint {durable[-1]} exists but resume is disabled at this Spirula pin "
                               "(num_sh 15 vs 16 adapt defect); refusing before any GPU training")
        resume_step = durable[-1]
        if resume_step >= T:
            raise AttemptError("a terminal checkpoint is already durable; acceptance-only recovery is not implemented")
        src = work / "resume_src"                       # outside the new run dir, so Spirula owns run/ exclusively
        _fetch_checkpoint(ctx, job, run_id, resume_step, src)
        resume_arg = str(src / f"step-{resume_step:09d}.ckpt")
    attempt = {"runId": run_id, "attemptId": attempt_id, "datasetSha256": job["datasetSha256"],
               "jobManifestSha256": job["jobManifestSha256"], "spirulaSha": ctx.hw["spirulaSha"],
               "binarySha256": ctx.hw["binarySha256"], "backend": ctx.hw["backend"], "gpuName": ctx.hw["gpuName"],
               "resumeFromStep": resume_step, "callId": ctx.call_id, "lease": lease}
    (work / "attempt.json").write_text(json.dumps(attempt, indent=1, default=str))
    extra += [("attempt.json", "attempt-record", None)]
    cmd = build_command(ctx.binary, job, str(data), str(work), RUN_NAME, resume=resume_arg)
    _status(ctx, run_id, attempt_id, "training", command=cmd, fidelity=fidelity, resumeFromStep=resume_step)
    st = {"cfg": None, "shipped": set(resume_step and [resume_step] or []), "sizes": {}, "hb": 0.0, "ship_err": None}

    def on_poll(elapsed):
        now = time.time()
        if now - st["hb"] > 60:
            try:
                lock.heartbeat()
            except LockRefused as exc:
                return f"lease lost: {exc}"
            st["hb"] = now
        cfgp = run_dir / "config.json"
        if st["cfg"] is None and cfgp.is_file():
            try:
                sha = normalized_config_sha(json.loads(cfgp.read_text()))
            except ValueError:
                return None                                                  # being written; next poll
            if sha != job["expectedResolvedConfigSha256"]:
                return f"resolved config {sha[:12]} != expected {job['expectedResolvedConfigSha256'][:12]}"
            st["cfg"] = sha
        for ck in sorted(run_dir.glob("step-*.ckpt")):
            step = int(ck.name[5:14])
            if step in st["shipped"] or step >= T or st["cfg"] is None:
                continue
            sizes = tuple((ck / f).stat().st_size if (ck / f).is_file() else -1 for f in ("state.tar", "splat.ply"))
            if -1 in sizes or st["sizes"].get(step) != sizes:
                st["sizes"][step] = sizes; continue                          # not stable yet
            try:
                st["shipped"].add(_ship_checkpoint(ctx, job, attempt, run_dir, ck, st["cfg"]))
            except Exception as exc:  # noqa: BLE001
                st["ship_err"] = str(exc)[:300]
                return f"checkpoint shipping failed: {st['ship_err']}"
        if inject_interrupt_after_step and any(s >= inject_interrupt_after_step for s in st["shipped"] if s != resume_step):
            return f"injected interruption after durable checkpoint {max(st['shipped'])}"
        return None

    limit_s = float(job["expectedMinutes"]) * 60 * 2
    res = run_trainer(cmd, work / "train.log", limit_s, on_poll=on_poll,
                      poll_s=1.0 if inject_interrupt_after_step else 5.0)
    extra += [("train.log", "train-log", None)]
    log = (work / "train.log").read_text(errors="replace")
    ledger.record(attempt_id, job["gpu"], time.time() - t_start, time.time() - t_start,
                  "stopped" if res["stopReason"] else f"exit {res['exitCode']}")
    if res["stopReason"]:
        return _status(ctx, run_id, attempt_id, "interrupted", reason=res["stopReason"], exitCode=res["exitCode"],
                       durableCheckpoints=sorted(st["shipped"]), elapsedS=res["elapsedS"],
                       diagnostics=_diagnostics(ctx, run_id, attempt_id, work))
    if (run_dir / "metrics.json").is_file():
        extra += [(f"{RUN_NAME}/metrics.json", "eval-metrics", None)]
    for p in sorted(run_dir.glob("eval-*.png")):
        extra.append((p.relative_to(work).as_posix(), "eval-image", None))
    if (run_dir / "scene_transform.json").is_file():
        extra.append((f"{RUN_NAME}/scene_transform.json", "scene-transform", None))
    try:
        decision = final_acceptance(s3=ctx.s3, bucket=ctx.bucket, prefix=f"{ctx.root}/runs/{run_id}/final/{attempt_id}",
                                    run_dir=run_dir, work=work, job=job, attempt=attempt, exit_code=res["exitCode"],
                                    log_text=log, extra_files=extra)
    except (GateRejected, JobRejected, InventoryRejected) as exc:
        return _status(ctx, run_id, attempt_id, "rejected", reason=str(exc), exitCode=res["exitCode"],
                       crashPresent="crash report" in log, durableCheckpoints=sorted(st["shipped"]),
                       diagnostics=_diagnostics(ctx, run_id, attempt_id, work))
    decision["ledger"] = ledger.load()
    lock.complete(decision)                                                   # 18: only now is the run terminal
    return _status(ctx, run_id, attempt_id, "completed", decision=decision)
