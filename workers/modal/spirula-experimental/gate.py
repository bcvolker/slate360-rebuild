"""THE single completion gate. Every exit path (exit 0, the known post-training SIGSEGV, a resumed attempt) goes
through final_acceptance(); nothing else may publish a terminal `completed` status.

Order: local artifact checks (1-15) -> inventory -> upload -> FRESH R2 read against the pre-upload inventory (16-17)
-> only then the caller publishes status (18). `state.txt` is never accepted."""

from __future__ import annotations

import hashlib
import json
import re
import tarfile
from pathlib import Path

import numpy as np

from ids import check_id
from inventory import build_inventory, upload_inventory, verify_remote

CRASH_MARKER = "=== Spirula Studio crash report ==="
KNOWN_SEGV_EXITS = (-11, 139)          # Popen returncode for SIGSEGV; shell-style 128+11
CONFIG_VOLATILE = ("data", "output_dir_prefix", "output_dir_name", "resume")
STATE_REQUIRED_NPY = ("world.means.npy", "world.quats.npy", "world.scales.npy", "world.opacities.npy",
                      "world.features_dc.npy")


class GateRejected(RuntimeError):
    pass


def ply_schema(sh_degree: int) -> list[str]:
    k = (sh_degree + 1) ** 2 - 1
    return (["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2"] + [f"f_rest_{i}" for i in range(3 * k)]
            + ["opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"])


def normalized_config_sha(config: dict) -> str:
    body = {k: v for k, v in config.items() if k not in CONFIG_VOLATILE}
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def check_ply(path: Path, sh_degree: int, count_min: int, count_max: int) -> dict:
    """Exact schema, exact byte length, and EVERY value of EVERY property finite (no sampling)."""
    raw = path.read_bytes()
    end = raw.find(b"end_header\n")
    if not raw.startswith(b"ply\n") or end < 0:
        raise GateRejected("master PLY: not a PLY")
    hdr = raw[:end].decode("ascii", "replace").splitlines()
    if "format binary_little_endian 1.0" not in hdr:
        raise GateRejected("master PLY: must be binary_little_endian 1.0")
    verts = [l for l in hdr if l.startswith("element vertex ")]
    if len(verts) != 1 or any(l.startswith("element ") and not l.startswith("element vertex") for l in hdr):
        raise GateRejected("master PLY: expected exactly one vertex element")
    n = int(verts[0].split()[-1])
    props = [l.split() for l in hdr if l.startswith("property ")]
    if any(p[1] != "float" for p in props):
        raise GateRejected("master PLY: every property must be float32")
    names = [p[-1] for p in props]
    if names != ply_schema(sh_degree):
        raise GateRejected(f"master PLY: schema mismatch ({len(names)} props, expected {len(ply_schema(sh_degree))})")
    body = memoryview(raw)[end + len(b"end_header\n"):]
    if len(body) != n * 4 * len(names):
        raise GateRejected("master PLY: body length does not equal vertex count x row size")
    if not (count_min <= n <= count_max):
        raise GateRejected(f"master PLY: gaussian count {n} outside {count_min}..{count_max}")
    a = np.frombuffer(body, dtype="<f4").reshape(n, len(names))
    bad = {}
    for j, name in enumerate(names):
        k = int((~np.isfinite(a[:, j])).sum())
        if k:
            bad[name] = k
    if bad:
        raise GateRejected(f"master PLY: non-finite values {bad}")
    q = np.linalg.norm(a[:, names.index("rot_0"):names.index("rot_3") + 1], axis=1)
    if int((q < 1e-8).sum()):
        raise GateRejected("master PLY: zero-length rotation quaternion")
    xyz = a[:, :3]
    return {"gaussianCount": n, "properties": len(names), "bytes": len(raw), "allValuesFinite": True,
            "bboxMin": xyz.min(0).round(4).tolist(), "bboxMax": xyz.max(0).round(4).tolist(),
            "sha256": hashlib.sha256(raw).hexdigest()}


def parse_state_tar(path: Path) -> dict:
    """A real resumable Spirula checkpoint: tar with state.json (full_resume=1) and the splat arrays."""
    if not path.is_file() or path.stat().st_size < 1024:
        raise GateRejected("state.tar missing or empty")
    try:
        with tarfile.open(path) as t:
            members = {m.name: m.size for m in t.getmembers()}
            if "state.json" not in members:
                raise GateRejected("state.tar has no state.json")
            state = json.loads(t.extractfile("state.json").read())
    except (tarfile.TarError, ValueError, OSError) as exc:
        raise GateRejected(f"state.tar unreadable: {exc}") from exc
    missing = [m for m in STATE_REQUIRED_NPY if m not in members or members[m] < 128]
    if missing:
        raise GateRejected(f"state.tar missing splat arrays {missing}")
    if int(state.get("full_resume", 0)) != 1:
        raise GateRejected("state.tar is not a full (resumable) checkpoint")
    return {"step": int(state["step"]), "curNumSplats": int(state.get("cur_num_splats", -1)), "state": state,
            "members": len(members)}


def terminal_evidence(log: str, terminal: int, eval_expected: bool) -> dict:
    """Spirula's own terminal lines, in order, before any crash report. NOTE: `Training complete. Steps: N` counts
    only the steps of THIS process (a resumed run prints T-k), so the terminal proof is the last `step T/T` line
    plus the checkpoint's own step (checked by the caller), never that count."""
    pre = log.split(CRASH_MARKER)[0]
    steps = [(int(m.group(1)), int(m.group(2))) for m in re.finditer(r"step\s+(\d+)/(\d+)", pre)]
    last = steps[-1] if steps else None
    i_done = pre.rfind("Training complete.")
    i_ck = pre.rfind("Checkpoint saved to:")
    ok = {"lastStepLine": list(last) if last else None, "trainingCompleteLine": i_done >= 0,
          "checkpointSavedBeforeComplete": 0 <= i_ck < i_done, "evalWritten": "Eval metrics written" in pre}
    if last != (terminal, terminal) or not ok["trainingCompleteLine"] or not ok["checkpointSavedBeforeComplete"]:
        raise GateRejected(f"trainer did not report completing step {terminal}: {ok}")
    if eval_expected and not (ok["evalWritten"] and pre.rfind("Eval metrics written") > i_done):
        raise GateRejected("recipe includes eval but the trainer did not report writing metrics")
    return ok


def resume_continuity(log: str) -> dict:
    """For a resumed attempt: Spirula must say where it resumed, and its next step line must follow on."""
    m = re.search(r"Resumed from (\S+) at step (\d+)", log)
    if not m:
        raise GateRejected("resumed attempt: Spirula did not report `Resumed from ... at step k`")
    k = int(m.group(2))
    after = [int(s.group(1)) for s in re.finditer(r"step\s+(\d+)/\d+", log[m.end():])]
    if not after or not (k < after[0] <= k + 100):
        raise GateRejected(f"resumed at step {k} but the next step line is {after[:1]}")
    return {"resumedFrom": m.group(1), "resumedAtStep": k, "firstStepAfterResume": after[0]}


def exit_acceptable(exit_code: int, log: str) -> dict:
    """0, or ONLY the known post-completion shutdown SIGSEGV. Real exit code and crash text are always returned."""
    if exit_code == 0:
        if CRASH_MARKER in log:
            raise GateRejected("exit 0 but a crash report was printed")
        return {"exitCode": 0, "crash": None, "acceptedAs": "clean exit"}
    crash = log[log.find(CRASH_MARKER):] if CRASH_MARKER in log else ""
    if exit_code not in KNOWN_SEGV_EXITS:
        raise GateRejected(f"exit code {exit_code} is not the known shutdown SIGSEGV")
    if not crash:
        raise GateRejected("SIGSEGV exit without a Spirula crash report")
    cause = re.search(r"cause:\s+(\S+)", crash)
    if not cause or cause.group(1) != "SIGSEGV":
        raise GateRejected(f"crash cause {cause.group(1) if cause else None} is not SIGSEGV")
    if "on_exit" not in crash or "__libc_start_main" not in crash:
        raise GateRejected("SIGSEGV stack is not the post-main on_exit shutdown signature")
    if "doing:" not in crash or " train" not in crash.split("doing:")[1].splitlines()[0]:
        raise GateRejected("crash report is not from `spirula train`")
    return {"exitCode": exit_code, "crash": crash[:3000], "acceptedAs": "known post-completion SIGSEGV in on_exit"}


def final_acceptance(*, s3, bucket: str, prefix: str, run_dir: Path, work: Path, job: dict, attempt: dict,
                     exit_code: int, log_text: str, extra_files: list[tuple[str, str, int | None]]) -> dict:
    """Checks 1-17. Raises GateRejected on the first failure. Returns the decision the caller publishes (18)."""
    check_id(attempt.get("runId"), "runId"); check_id(attempt.get("attemptId"), "attemptId")
    if attempt["runId"] != job["runId"]:                                             # 1
        raise GateRejected("attempt belongs to a different logical run")
    if attempt["attemptId"] != job["attemptId"]:                                     # 2
        raise GateRejected("attempt id does not own these outputs")
    if attempt["datasetSha256"] != job["datasetSha256"]:                             # 3
        raise GateRejected("dataset hash differs from the job")
    if attempt["jobManifestSha256"] != job["jobManifestSha256"]:                     # 4
        raise GateRejected("golden/job manifest hash differs")
    cfg_path = run_dir / "config.json"
    if not cfg_path.is_file():
        raise GateRejected("trainer config.json missing")
    cfg_sha = normalized_config_sha(json.loads(cfg_path.read_text()))
    if cfg_sha != job["expectedResolvedConfigSha256"]:                               # 5
        raise GateRejected(f"resolved config hash {cfg_sha[:12]} != expected {job['expectedResolvedConfigSha256'][:12]}")
    if attempt["spirulaSha"] != job["spirulaSha"] or attempt["binarySha256"] != job["binarySha256"]:  # 6
        raise GateRejected("Spirula SHA or binary hash differs")
    if attempt.get("backend") != "cuda" or job["gpu"] not in str(attempt.get("gpuName", "")):  # 7
        raise GateRejected(f"backend/GPU {attempt.get('backend')}/{attempt.get('gpuName')} not {job['gpu']}/cuda")
    T = int(job["terminalStep"])
    exit_info = exit_acceptable(exit_code, log_text)
    evidence = terminal_evidence(log_text, T, bool(job.get("evalExpected")))         # 8
    if attempt.get("resumeFromStep") is not None:
        evidence["resume"] = resume_continuity(log_text)
        if evidence["resume"]["resumedAtStep"] != int(attempt["resumeFromStep"]):
            raise GateRejected("Spirula resumed at a different step than the durable checkpoint")
    ck = run_dir / f"step-{T:09d}.ckpt"
    if (ck / "state.txt").exists():
        raise GateRejected("state.txt is not an acceptable checkpoint")
    st = parse_state_tar(ck / "state.tar")                                           # 9
    if st["step"] != T:                                                              # 10
        raise GateRejected(f"terminal checkpoint holds step {st['step']}, requested {T}")
    later = sorted(p.name for p in run_dir.glob("step-*.ckpt") if int(p.name[5:14]) > T)
    if later:
        raise GateRejected(f"checkpoints beyond the terminal step exist: {later}")
    ply = ck / "splat.ply"                                                           # 11
    rep = check_ply(ply, int(job["shDegree"]), int(job["countMin"]), int(job["countMax"]))  # 13-15
    if st["curNumSplats"] > 0 and not (0.9 * st["curNumSplats"] <= rep["gaussianCount"] <= st["curNumSplats"]):
        raise GateRejected("PLY count is not consistent with the terminal checkpoint state")
    rel_ck = ck.relative_to(work).as_posix()
    files = [(f"{rel_ck}/state.tar", "terminal-state", T), (f"{rel_ck}/splat.ply", "master-ply", T),
             (cfg_path.relative_to(work).as_posix(), "resolved-config", None)] + extra_files
    inv = build_inventory(work, files, job["runId"], job["attemptId"])
    by = {it["path"]: it for it in inv["items"]}
    if by[f"{rel_ck}/splat.ply"]["sha256"] != rep["sha256"]:                          # 12
        raise GateRejected("master PLY changed between validation and inventory")
    upload_inventory(s3, bucket, prefix, work, inv)
    verified = verify_remote(s3, bucket, prefix, inv, set(job["requiredArtifactTypes"]))  # 16-17
    return {"accepted": True, "runId": job["runId"], "attemptId": job["attemptId"], "terminalStep": T,
            **exit_info, "evidence": evidence, "stateTar": {k: v for k, v in st.items() if k != "state"},
            "masterPly": rep, "resolvedConfigSha256": cfg_sha, "datasetSha256": job["datasetSha256"],
            "jobManifestSha256": job["jobManifestSha256"], "spirulaSha": job["spirulaSha"],
            "inventory": verified}
