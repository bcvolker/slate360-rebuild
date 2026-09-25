"""Prepared-dataset entrypoint contract: an immutable job manifest -> the exact Spirula train-only command.

Unknown job fields or flags are REJECTED (never dropped); values the manifest specifies are never replaced by
defaults. The dataset is content-addressed in R2 (objects/<sha256>) and materialized file by file, each checked
against the dataset manifest before any GPU work."""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import struct
from pathlib import Path

from ids import check_id

JOB_KEYS = {"schema", "runId", "spirulaSha", "binarySha256", "backend", "gpu", "preset", "flags",
            "expectedResolvedConfigSha256", "dataset", "terminalStep", "shDegree", "countMin", "countMax",
            "evalExpected", "expectedMinutes", "requiredArtifactTypes", "cameraDump", "notes"}
DATASET_REF_KEYS = {"manifestKey", "manifestSha256", "datasetSha256", "objectsPrefix"}
# Every flag the golden Room 213 recipe uses; nothing else may be passed. LOCKED values are the golden values; the
# only widening is --warp-to-pinhole 1 for the approved Room 213 projection A/B (2026-09-24).
ALLOWED_FLAGS = {"--data-format", "--image-dir", "--mask-dir", "--load-masks", "--eval-mode", "--warp-to-pinhole",
                 "--train-resolution-divisor", "--primitive", "--cap-max", "--num-iterations", "--use-bilateral-grid",
                 "--use-bilateral-grid-for-geometry", "--use-ppisp", "--load-depths", "--load-normals",
                 "--normal-supervision-weight", "--depth-supervision-weight", "--steps-per-save",
                 "--save-only-latest-checkpoint", "--save-full-checkpoint", "--save-eval-images", "--disable-viewer",
                 "--keep-viewer-alive",
                 "--ppisp-param-type", "--loss-scale-min-pixels", "--num-loss-scales", "--densify-loss-map-mode"}
# NOTE: --max-steps is NOT a stop in this Spirula revision (it is the LR-schedule horizon); never allowed in a job.
LOCKED = {"--warp-to-pinhole": ("0", "1"), "--load-depths": "0", "--load-normals": "0", "--use-ppisp": ("0", "1"),
          "--use-bilateral-grid": ("0", "1"), "--use-bilateral-grid-for-geometry": "0", "--save-full-checkpoint": "1",
          "--disable-viewer": "1", "--data-format": "colmap"}


# Optional flags: absent = the golden resolved value; present = only these values (approved 2026-09-24 photoreal push).
PINNED_OPTIONAL = {"--ppisp-param-type": ("no_crf_no_vig",), "--loss-scale-min-pixels": ("1920", "0"),
                   "--num-loss-scales": ("0",), "--densify-loss-map-mode": ("ssim_cs", "edge_aware")}


class JobRejected(RuntimeError):
    pass


def canonical_sha(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def load_job(raw: bytes, expected_sha: str) -> dict:
    if hashlib.sha256(raw).hexdigest() != expected_sha:
        raise JobRejected("job manifest bytes do not match the requested manifest hash")
    job = json.loads(raw)
    unknown = set(job) - JOB_KEYS
    missing = (JOB_KEYS - {"cameraDump", "notes"}) - set(job)
    if unknown or missing:
        raise JobRejected(f"job manifest fields unknown={sorted(unknown)} missing={sorted(missing)}")
    if job["schema"] != "spirula-job-v1" or job["preset"] != "3dgs" or job["backend"] != "cuda":
        raise JobRejected("unsupported schema/preset/backend")
    check_id(job["runId"], "runId")
    if set(job["dataset"]) != DATASET_REF_KEYS:
        raise JobRejected("dataset reference fields invalid")
    seen = set()
    for pair in job["flags"]:
        if not (isinstance(pair, list) and len(pair) == 2 and all(isinstance(x, str) for x in pair)):
            raise JobRejected(f"malformed flag {pair!r}")
        name, val = pair
        if name not in ALLOWED_FLAGS or name in seen:
            raise JobRejected(f"flag {name} not allowed or repeated")
        allowed = LOCKED.get(name)
        if allowed is not None and val not in (allowed if isinstance(allowed, tuple) else (allowed,)):
            raise JobRejected(f"flag {name} is locked to {LOCKED[name]}")
        if name in PINNED_OPTIONAL and val not in PINNED_OPTIONAL[name]:
            raise JobRejected(f"flag {name} only allows {PINNED_OPTIONAL[name]}")
        seen.add(name)
    missing_locked = set(LOCKED) - seen
    if missing_locked:
        raise JobRejected(f"locked flags must be explicit: {sorted(missing_locked)}")
    job["jobManifestSha256"] = expected_sha
    return job


def build_command(binary: str, job: dict, data_dir: str, out_prefix: str, out_name: str,
                  resume: str | None = None) -> list[str]:
    cmd = [binary, "train", job["preset"], "--data", data_dir]
    for name, val in job["flags"]:
        cmd += [name, val]
    cmd += ["--output-dir-prefix", out_prefix, "--output-dir-name", out_name]
    if resume:
        cmd += ["--resume", resume]
    return cmd


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        raise JobRejected(f"{path.name} is not a PNG")
    return struct.unpack(">II", head[16:24])


def materialize(s3, bucket: str, job: dict, dest: Path) -> dict:
    """Download the dataset manifest (hash-checked), then every file by content hash; verify each file."""
    ref = job["dataset"]
    raw = s3.get_object(Bucket=bucket, Key=ref["manifestKey"])["Body"].read()
    if hashlib.sha256(raw).hexdigest() != ref["manifestSha256"]:
        raise JobRejected("dataset manifest bytes do not match the job")
    man = json.loads(raw)
    if canonical_sha(man["files"]) != ref["datasetSha256"]:
        raise JobRejected("dataset file list hash does not match the job")
    if dest.exists():
        shutil.rmtree(dest)
    cache: dict[str, Path] = {}
    for f in man["files"]:
        rel = f["path"]
        if rel.startswith("/") or ".." in rel.split("/") or "\\" in rel:
            raise JobRejected(f"illegal dataset path {rel}")
        out = dest / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        if f["sha256"] in cache:
            shutil.copyfile(cache[f["sha256"]], out)
        else:
            body = s3.get_object(Bucket=bucket, Key=f"{ref['objectsPrefix']}/{f['sha256']}")["Body"].read()
            if len(body) != f["bytes"] or hashlib.sha256(body).hexdigest() != f["sha256"]:
                raise JobRejected(f"object for {rel} does not match its manifest hash")
            out.write_bytes(body)
            cache[f["sha256"]] = out
    return man


def _read_colmap_text(sparse: Path) -> tuple[dict, dict]:
    cams = {}
    for ln in (sparse / "cameras.txt").read_text().splitlines():
        if ln and not ln.startswith("#"):
            p = ln.split()
            cams[int(p[0])] = {"model": p[1], "width": int(p[2]), "height": int(p[3]), "params": [float(x) for x in p[4:]]}
    imgs = {}
    lines = (sparse / "images.txt").read_text().splitlines()
    for i in range(0, len(lines), 2):
        p = lines[i].split()
        if not p or p[0].startswith("#"):
            continue
        imgs[p[9]] = {"id": int(p[0]), "q": [float(x) for x in p[1:5]], "t": [float(x) for x in p[5:8]],
                      "cameraId": int(p[8])}
    return cams, imgs


def verify_fidelity(root: Path, man: dict) -> dict:
    """Exhaustive: every image's camera id, lens, split, pose, dimensions and mask; every camera's intrinsics and
    distortion; scene transform and importer settings -- all compared to the dataset manifest exactly."""
    from inventory import sha256_file
    on_disk = sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())
    listed = sorted(f["path"] for f in man["files"])
    if on_disk != listed:
        raise JobRejected(f"dataset tree differs from the manifest file list ({len(on_disk)} vs {len(listed)})")
    for f in man["files"]:
        if sha256_file(root / f["path"]) != f["sha256"]:
            raise JobRejected(f"{f['path']} checksum mismatch after materialize")
    cams, imgs = _read_colmap_text(root / "sparse" / "0")
    want_cams = {int(c["id"]): c for c in man["cameras"]}
    if set(cams) != set(want_cams):
        raise JobRejected("camera id set differs")
    for cid, c in cams.items():
        w = want_cams[cid]
        if (c["model"], c["width"], c["height"]) != (w["model"], w["width"], w["height"]) or c["params"] != w["params"]:
            raise JobRejected(f"camera {cid} intrinsics/distortion differ from the manifest")
    want = {im["name"]: im for im in man["images"]}
    if set(imgs) != set(want):
        raise JobRejected(f"image set differs ({len(imgs)} in model, {len(want)} in manifest)")
    counts = {}
    for name, im in imgs.items():
        w = want[name]
        if im["cameraId"] != w["cameraId"] or im["q"] != w["q"] or im["t"] != w["t"]:
            raise JobRejected(f"{name}: camera id or pose differs from the manifest")
        if not all(math.isfinite(v) for v in im["q"] + im["t"]):
            raise JobRejected(f"{name}: non-finite pose")
        if w["lens"] is not None:
            folder = name.split("/")[0]
            if man["lensFolders"].get(folder) != w["cameraId"] or man["lensOfCamera"].get(str(w["cameraId"])) != w["lens"]:
                raise JobRejected(f"{name}: lens folder / physical lens does not map to its camera id")
        if man["splitRule"] == "filename":
            split = "train" if "_train" in name else ("eval" if "eval" in name else None)
        elif man["splitRule"] == "all-train":
            split = "train"
        else:
            raise JobRejected(f"unknown split rule {man['splitRule']}")
        if split != w["split"]:
            raise JobRejected(f"{name}: split {split} != manifest {w['split']}")
        dims = png_size(root / "images" / name)
        cam = want_cams[w["cameraId"]]
        if dims != (cam["width"], cam["height"]):
            raise JobRejected(f"{name}: image {dims} does not match camera {cam['width']}x{cam['height']}")
        if w.get("mask") and not (root / "masks" / name).is_file():
            raise JobRejected(f"{name}: mask missing")
        counts[(w["role"], split)] = counts.get((w["role"], split), 0) + 1
    if man.get("sceneTransform") != "identity" or man.get("projection") != "native-fisheye-K1":
        raise JobRejected("scene transform / projection contract changed")
    return {"files": len(listed), "images": len(imgs), "cameras": len(cams),
            "byRoleSplit": {f"{k[0]}:{k[1]}": v for k, v in sorted(counts.items())}}


def compare_camera_dump(dump: dict, golden: dict, data_root: str, golden_root: str, tol: float = 1e-6) -> dict:
    """Spirula's own parsed/post-split cameras vs the golden run's dump, value by value (all train cameras)."""
    strip = lambda xs, r: [x[len(r):] if x.startswith(r) else x for x in xs]
    if strip(dump["image_filenames"], data_root) != strip(golden["image_filenames"], golden_root):
        raise JobRejected("imported image order/names differ from the golden run")
    for k in ("num_cameras", "n_post", "num_points", "camera_models", "widths", "heights", "K_per_camera",
              "post_offsets"):
        if dump[k] != golden[k]:
            raise JobRejected(f"camera dump field {k} differs from golden")
    worst = {}
    for k in ("c2w", "viewmats", "intrins", "dist_coeffs", "train_to_normalized", "points_head"):
        a, b = dump[k], golden[k]
        if len(a) != len(b):
            raise JobRejected(f"camera dump field {k} length differs")
        d = max((abs(x - y) for x, y in zip(a, b)), default=0.0)
        worst[k] = d
        if d > tol * max(1.0, max((abs(y) for y in b), default=1.0)):
            raise JobRejected(f"camera dump field {k} differs by {d}")
    if abs(dump["train_frame_scale"] - golden["train_frame_scale"]) > 1e-6:
        raise JobRejected("train_frame_scale differs")
    return {"cameras": dump["num_cameras"], "maxAbsDiff": worst}
