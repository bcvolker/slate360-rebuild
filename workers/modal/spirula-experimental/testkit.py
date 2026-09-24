"""Test doubles for the hardening suite: an in-memory S3 with R2's conditional-write semantics, plus builders for a
real-format Spirula terminal checkpoint (PLY + state.tar + config + log)."""

from __future__ import annotations

import hashlib
import io
import json
import tarfile
from pathlib import Path

import numpy as np
from botocore.exceptions import ClientError

from gate import normalized_config_sha, ply_schema


def _err(code: str, status: int) -> ClientError:
    return ClientError({"Error": {"Code": code}, "ResponseMetadata": {"HTTPStatusCode": status}}, "op")


class FakeS3:
    def __init__(self):
        self.d: dict[str, bytes] = {}; self.n = 0; self.etags: dict[str, str] = {}
        self.tamper: dict[str, bytes] = {}          # key -> bytes actually stored on upload (simulated corruption)
        self.drop_uploads: set[str] = set()         # keys whose upload silently does nothing

    def _store(self, key, body):
        self.n += 1; self.d[key] = body; self.etags[key] = f'"e{self.n}"'; return self.etags[key]

    def put_object(self, Bucket, Key, Body, IfNoneMatch=None, IfMatch=None, **_):
        if IfNoneMatch == "*" and Key in self.d:
            raise _err("PreconditionFailed", 412)
        if IfMatch is not None and self.etags.get(Key) != IfMatch:
            raise _err("PreconditionFailed", 412)
        return {"ETag": self._store(Key, Body if isinstance(Body, bytes) else Body.read())}

    def upload_file(self, path, Bucket, Key):
        if any(Key.endswith(s) for s in self.drop_uploads):
            return
        body = Path(path).read_bytes()
        for suffix, bad in self.tamper.items():
            if Key.endswith(suffix):
                body = bad
        self._store(Key, body)

    def get_object(self, Bucket, Key):
        if Key not in self.d:
            raise _err("NoSuchKey", 404)
        return {"Body": io.BytesIO(self.d[Key]), "ETag": self.etags[Key]}

    def head_object(self, Bucket, Key):
        if Key not in self.d:
            raise _err("404", 404)
        return {"ContentLength": len(self.d[Key])}

    def list_objects_v2(self, Bucket, Prefix, **_):
        return {"Contents": [{"Key": k} for k in sorted(self.d) if k.startswith(Prefix)], "IsTruncated": False}


def ply_bytes(n=64, sh=3, poison: dict | None = None, dtype="float", drop_bytes=0) -> bytes:
    names = ply_schema(sh)
    rng = np.random.default_rng(0)
    a = rng.normal(size=(n, len(names))).astype("<f4")
    a[:, names.index("rot_0")] = 1.0
    for prop, val in (poison or {}).items():
        a[3, names.index(prop)] = val
    hdr = ["ply", "format binary_little_endian 1.0", f"element vertex {n}"]
    hdr += [f"property {dtype if nm == 'scale_1' else 'float'} {nm}" for nm in names] + ["end_header"]
    body = a.tobytes()
    return ("\n".join(hdr) + "\n").encode() + body[:len(body) - drop_bytes]


def state_tar_bytes(step: int, n: int = 64, full_resume: int = 1) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as t:
        def add(name, data):
            ti = tarfile.TarInfo(name); ti.size = len(data); t.addfile(ti, io.BytesIO(data))
        add("state.json", json.dumps({"format_version": 1, "full_resume": full_resume, "step": step,
                                      "primitive": "3dgut", "cur_num_splats": n, "max_num_splats": n}).encode())
        for m in ("world.means", "world.quats", "world.scales", "world.opacities", "world.features_dc"):
            b = io.BytesIO(); np.save(b, np.zeros((n, 4), np.float32)); add(m + ".npy", b.getvalue())
    return buf.getvalue()


CONFIG = {"data": "/x", "output_dir_prefix": "/w", "output_dir_name": "run", "num_iterations": 100, "cap_max": 64,
          "sh_degree": 3, "primitive": "3dgut", "warp_to_pinhole": False}
SEGV = ("\n=== Spirula Studio crash report ===\ntime: x\ndoing:   /opt/spirula/bin/spirula train\n"
        "cause:   SIGSEGV at 0x5638a7bca\nstack:\n  #5 libc.so.6+0x45610  on_exit\n"
        "  #7 libc.so.6+0x29e40  __libc_start_main\n")
ABRT = SEGV.replace("SIGSEGV", "SIGABRT")


def good_log(T=100, resumed_at=None) -> str:
    lines = ["command: spirula train 3dgs"]
    if resumed_at is not None:
        lines.append(f"Resumed from /w/resume_src/step-{resumed_at:09d}.ckpt at step {resumed_at}")
        lines.append(f"step  {resumed_at + 1}/{T} ( 50%)  splats 64")
    lines += [f"step  {T}/{T} (100%)  splats 64", "Checkpoint saved to: /w/run",
              f"Training complete. Steps: {T}   Time: 00:00:01", "Eval metrics written to /w/run/metrics.json"]
    return "\n".join(lines) + "\n"


def make_run(work: Path, T=100, n=64, ply=None, state=None, config=None, state_txt=False, later=False) -> dict:
    run = work / "run"; ck = run / f"step-{T:09d}.ckpt"; ck.mkdir(parents=True)
    (run / "config.json").write_text(json.dumps(config or CONFIG))
    (ck / "splat.ply").write_bytes(ply if ply is not None else ply_bytes(n))
    (ck / "state.tar").write_bytes(state if state is not None else state_tar_bytes(T, n))
    if state_txt:
        (ck / "state.txt").write_text(f"step {T}\n")
    if later:
        (run / f"step-{T + 100:09d}.ckpt").mkdir()
    (work / "train.log").write_text("x")
    job = {"runId": "fixture-run", "attemptId": "fixture-run-a01", "datasetSha256": "d" * 64,
           "jobManifestSha256": "j" * 64, "expectedResolvedConfigSha256": normalized_config_sha(CONFIG),
           "spirulaSha": "s" * 40, "binarySha256": "b" * 64, "gpu": "L40S", "terminalStep": T, "shDegree": 3,
           "countMin": 1, "countMax": 1000, "evalExpected": True,
           "requiredArtifactTypes": ["master-ply", "terminal-state", "resolved-config", "train-log"]}
    attempt = {"runId": "fixture-run", "attemptId": "fixture-run-a01", "datasetSha256": "d" * 64,
               "jobManifestSha256": "j" * 64, "spirulaSha": "s" * 40, "binarySha256": "b" * 64, "backend": "cuda",
               "gpuName": "NVIDIA L40S, 46068 MiB", "resumeFromStep": None}
    return {"run": run, "job": job, "attempt": attempt}


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()
