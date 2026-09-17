"""Stage 3 - Structure-from-Motion (COLMAP, invoked directly).

Native mode (Proven default, verified 2026-09-12): registers each panorama
ONCE with COLMAP's own EQUIRECTANGULAR camera model - no upstream split into
cube faces. This mirrors the reference studio's own architecture and runs on
stock COLMAP 4.1.0 already installed on this machine (confirmed end to end:
feature_extractor / sequential_matcher / mapper all accept EQUIRECTANGULAR).

Rig mode (Lab fallback): splits each panorama into 6 cube faces at a shared
camera center via a COLMAP rig, for captures where Native under-registers.

Matching: sequential matching with vocab-tree loop closure is the default
above _EXHAUSTIVE_MAX panoramas, matching the reference studio's own
approach. Measured on this machine on the real 815-panorama kitchen capture
(2026-09-12, identical feature set both times): exhaustive took 2,900s
(48.3 min, 332k pairs); sequential+loop-closure took 197s (3.3 min) - a
14.7x speedup, consistent with the reference's own reported ~434s. Exhaustive
is kept only as a fallback for tiny captures below _EXHAUSTIVE_MAX, where its
simplicity (no vocab-tree dependency) outweighs the small time cost.
Never run exhaustive matching on split cube faces - that produced tens of
millions of pairs and ran for hours without finishing (root-caused
2026-09-12; see docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md Sec 0).
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from result import StageResult
from tools import which_tool
from sources import discover_groups

_EXHAUSTIVE_MAX = 200
_COLMAP_ROOT = "/home/rian_/slate360-engines/colmap-4.1.0"
_VOCAB_TREE = f"{_COLMAP_ROOT}/vocab_tree_faiss_flickr100K_words32K.bin"


_LIVE_DIR: Path | None = None


def _emit(record: dict) -> None:
    # stdout may be a pipe into a Next.js process that has died (2026-09-16:
    # every overnight stall). Never let a closed pipe kill SfM; the on-disk
    # live-status.json is the record that survives.
    try:
        sys.stdout.write(json.dumps(record, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    except (BrokenPipeError, OSError):
        pass
    if _LIVE_DIR is not None:
        try:
            from live_status import patch_live
            patch_live(_LIVE_DIR, record)
        except Exception:
            pass


def _matching_done(job_dir: Path, db_path: Path, image_count: int) -> bool:
    """True when a previous run finished matching for this database.

    Resume-from-sfm used to redo features + matching (GPU, ~10 min on 376
    panos) before the mapper. Features already resume via _db_image_count;
    this reuses the matches when live-status.json recorded sfm.matching done
    and the database really holds pairs for every image.
    """
    try:
        live = json.loads((job_dir / "live-status.json").read_text(encoding="utf-8"))
        rec = next((s for s in live.get("stages", []) if s.get("name") == "sfm.matching"), None)
        if not rec or rec.get("status") != "done":
            return False
    except Exception:
        return False
    return _db_image_count(db_path) >= image_count and _db_pair_count(db_path) > 0


def _db_pair_count(db_path: Path) -> int:
    if not db_path.exists():
        return 0
    try:
        import sqlite3
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            row = con.execute("SELECT COUNT(*) FROM two_view_geometries").fetchone()
            return int(row[0]) if row else 0
        finally:
            con.close()
    except Exception:
        return 0


def _colmap() -> str | None:
    return which_tool("colmap")


def run(cfg, ctx) -> StageResult:
    global _LIVE_DIR
    _LIVE_DIR = Path(ctx["job_dir"]) if ctx.get("job_dir") else None
    images_dir: Path = ctx["images_dir"]
    masks_dir = Path(ctx["masks_colmap_dir"]) if ctx.get("masks_colmap_dir") else None
    frames = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.png"))
    if not frames:
        return StageResult(name="sfm", status="failed", error="no images to run SfM on")

    colmap = _colmap()
    if not colmap:
        return StageResult(
            name="sfm", status="blocked",
            detail="colmap not on PATH",
            error="COLMAP CLI not found. Expected at "
                  f"{_COLMAP_ROOT}/bin/colmap - check lib/splat-lab/wsl.ts WSL_COLMAP_BIN.")

    work_dir: Path = ctx["job_dir"] / "sfm"
    work_dir.mkdir(parents=True, exist_ok=True)

    if cfg.is360 and cfg.spherical_mode == "rig":
        return _run_rig(cfg, colmap, images_dir, masks_dir, work_dir, ctx)
    groups = discover_groups(images_dir)
    if len(groups) > 1:
        return _run_mixed(cfg, colmap, groups, masks_dir, work_dir, ctx)
    if cfg.is360:
        return _run_native(cfg, colmap, images_dir, masks_dir, work_dir, ctx)
    return _run_flat(cfg, colmap, images_dir, masks_dir, work_dir, ctx)


def _run_native(cfg, colmap: str, images_dir: Path, masks_dir: Path | None,
                 work_dir: Path, ctx: dict) -> StageResult:
    """Native EQUIRECTANGULAR SfM directly on the panoramas (Proven default)."""
    db_path = work_dir / "database.db"
    sparse_dir = work_dir / "sparse"
    frames = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.png"))
    n = len(frames)

    t_features = _timed_step("sfm.features", lambda: _feature_extract(
        colmap, db_path, images_dir, masks_dir, "EQUIRECTANGULAR", cfg.max_features))
    if t_features.status != "done":
        return t_features

    matcher_kind = "exhaustive" if n <= _EXHAUSTIVE_MAX else "sequential+loop"
    if _matching_done(ctx["job_dir"], db_path, n):
        t_matching = StageResult(name="sfm.matching", status="done", elapsed_s=0.0,
                                 detail=f"reused matches from a previous run ({n} images)")
        _emit({"stage": "sfm.matching", "status": "done", "progress": 1.0, "elapsed_s": 0.0,
               "detail": t_matching.detail, "error": ""})
    else:
        t_matching = _timed_step("sfm.matching", lambda: _match(colmap, db_path, n))
    if t_matching.status != "done":
        return t_matching

    sparse_dir.mkdir(parents=True, exist_ok=True)
    t_mapping = _timed_step("sfm.mapping", lambda: _mapper(colmap, db_path, images_dir, sparse_dir))
    if t_mapping.status != "done":
        return t_mapping

    model_dir = _latest_model(sparse_dir)
    if model_dir is None:
        return StageResult(name="sfm", status="failed", error="mapper produced no sparse model")

    stats = _analyze(colmap, model_dir)
    _write_points_ply(colmap, model_dir, work_dir / "points.ply")
    text_dir = _write_text_export(colmap, model_dir, work_dir)
    ctx["sfm_sparse_txt_dir"] = str(text_dir)
    _write_preview(work_dir, ctx)

    (work_dir / "stats.json").write_text(json.dumps({
        "mode": "native", "matcher": matcher_kind, "registered": stats["registered"],
        "total": n, "points": stats["points"], "mean_reproj_px": stats["mean_reproj_px"],
        "elapsed": {"features": t_features.elapsed_s, "matching": t_matching.elapsed_s,
                    "mapping": t_mapping.elapsed_s},
    }, indent=2), encoding="utf-8")

    ctx["sfm_sparse_dir"] = str(model_dir)
    ctx["sfm_images_dir"] = str(images_dir)
    ctx["sfm_stats"] = stats
    ctx["sfm_camera_model"] = "EQUIRECTANGULAR"
    detail = (f"native SfM: {stats['registered']}/{n} panoramas registered, "
              f"{stats['points']} points, {stats['mean_reproj_px']:.2f}px reprojection")
    return StageResult(name="sfm", status="done", detail=detail,
                       artifacts=[str(model_dir), str(work_dir / "points.ply")])


def _run_rig(cfg, colmap: str, images_dir: Path, masks_dir: Path | None,
             work_dir: Path, ctx: dict) -> StageResult:
    """Lab fallback: 6 cube faces per panorama via a COLMAP rig (shared center)."""
    try:
        import numpy as np
        from PIL import Image
        import py360convert  # type: ignore
    except ImportError as exc:
        return StageResult(
            name="sfm", status="blocked",
            detail="py360convert / numpy / pillow not installed",
            error=f"Install 360 split deps: pip install py360convert numpy pillow ({exc})")

    faces_dir = work_dir / "faces"
    faces_dir.mkdir(parents=True, exist_ok=True)
    face_masks_dir = work_dir / "faces_masks" if masks_dir else None
    if face_masks_dir:
        face_masks_dir.mkdir(parents=True, exist_ok=True)
    face_size = 1536
    frames = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.png"))
    face_names = ("front", "right", "back", "left", "up", "down")

    for pano in frames:
        equi = np.asarray(Image.open(pano).convert("RGB"))
        cube = py360convert.e2c(equi, face_w=face_size, mode="bilinear", cube_format="dict")
        for name in face_names:
            face = cube[name] if isinstance(cube, dict) else cube
            Image.fromarray(face).save(faces_dir / f"{pano.stem}_{name}.jpg", quality=92)
        if masks_dir:
            mpath = masks_dir / f"{pano.name}.png"
            if mpath.exists():
                mimg = np.asarray(Image.open(mpath).convert("L"))
                mcube = py360convert.e2c(mimg[..., None].repeat(3, -1), face_w=face_size,
                                          mode="nearest", cube_format="dict")
                for name in face_names:
                    mface = mcube[name] if isinstance(mcube, dict) else mcube
                    Image.fromarray(mface[..., 0]).save(
                        face_masks_dir / f"{pano.stem}_{name}.jpg.png")

    n = len(frames) * 6
    db_path = work_dir / "database.db"
    t_features = _timed_step("sfm.features", lambda: _feature_extract(
        colmap, db_path, faces_dir, face_masks_dir, "SIMPLE_PINHOLE", cfg.max_features,
        single_camera_per_folder=False))
    if t_features.status != "done":
        return t_features

    t_matching = _timed_step("sfm.matching", lambda: _match(colmap, db_path, n))
    if t_matching.status != "done":
        return t_matching

    sparse_dir = work_dir / "sparse"
    sparse_dir.mkdir(parents=True, exist_ok=True)
    t_mapping = _timed_step("sfm.mapping", lambda: _mapper(colmap, db_path, faces_dir, sparse_dir))
    if t_mapping.status != "done":
        return t_mapping

    model_dir = _latest_model(sparse_dir)
    if model_dir is None:
        return StageResult(name="sfm", status="failed", error="mapper produced no sparse model")
    stats = _analyze(colmap, model_dir)
    _write_points_ply(colmap, model_dir, work_dir / "points.ply")
    text_dir = _write_text_export(colmap, model_dir, work_dir)
    ctx["sfm_sparse_txt_dir"] = str(text_dir)
    _write_preview(work_dir, ctx)

    (work_dir / "stats.json").write_text(json.dumps({
        "mode": "rig", "matcher": "exhaustive" if n <= _EXHAUSTIVE_MAX else "sequential+loop",
        "registered": stats["registered"], "total": n, "points": stats["points"],
        "mean_reproj_px": stats["mean_reproj_px"],
        "elapsed": {"features": t_features.elapsed_s, "matching": t_matching.elapsed_s,
                    "mapping": t_mapping.elapsed_s},
    }, indent=2), encoding="utf-8")

    ctx["sfm_sparse_dir"] = str(model_dir)
    ctx["sfm_images_dir"] = str(faces_dir)
    ctx["sfm_stats"] = stats
    ctx["sfm_camera_model"] = "SIMPLE_PINHOLE"
    detail = f"rig SfM: {stats['registered']}/{n} faces registered, {stats['points']} points"
    return StageResult(name="sfm", status="done", detail=detail,
                       artifacts=[str(model_dir), str(work_dir / "points.ply")])


def _run_flat(cfg, colmap: str, images_dir: Path, masks_dir: Path | None,
              work_dir: Path, ctx: dict) -> StageResult:
    """Flat stills/drone-photo SfM (not 360): OPENCV camera, EXIF-derived intrinsics."""
    frames = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.png"))
    n = len(frames)
    db_path = work_dir / "database.db"
    existing_model = _latest_model(work_dir / "sparse")
    if existing_model is not None:
        stats = _analyze(colmap, existing_model)
        ctx["sfm_sparse_dir"] = str(existing_model)
        ctx["sfm_images_dir"] = str(images_dir)
        ctx["sfm_stats"] = stats
        ctx["sfm_camera_model"] = "OPENCV"
        return StageResult(name="sfm", status="done",
                           detail=f"reused SfM: {stats['registered']}/{n} registered",
                           artifacts=[str(existing_model)])
    t_features = _timed_step("sfm.features", lambda: _feature_extract(
        colmap, db_path, images_dir, masks_dir, "OPENCV", cfg.max_features,
        single_camera_per_folder=True, max_image_size=2048, use_gpu=True))
    if t_features.status != "done":
        return t_features
    t_matching = _timed_step("sfm.matching", lambda: _match(colmap, db_path, n, unordered=True))
    if t_matching.status != "done":
        return t_matching
    sparse_dir = work_dir / "sparse"
    sparse_dir.mkdir(parents=True, exist_ok=True)
    t_mapping = _timed_step("sfm.mapping", lambda: _mapper(colmap, db_path, images_dir, sparse_dir))
    if t_mapping.status != "done":
        return t_mapping
    model_dir = _latest_model(sparse_dir)
    if model_dir is None:
        return StageResult(name="sfm", status="failed", error="mapper produced no sparse model")
    stats = _analyze(colmap, model_dir)
    _write_points_ply(colmap, model_dir, work_dir / "points.ply")
    text_dir = _write_text_export(colmap, model_dir, work_dir)
    ctx["sfm_sparse_txt_dir"] = str(text_dir)
    _write_preview(work_dir, ctx)
    (work_dir / "stats.json").write_text(json.dumps({
        "mode": "flat", "registered": stats["registered"], "total": n,
        "points": stats["points"], "mean_reproj_px": stats["mean_reproj_px"],
        "elapsed": {"features": t_features.elapsed_s, "matching": t_matching.elapsed_s,
                    "mapping": t_mapping.elapsed_s},
    }, indent=2), encoding="utf-8")
    ctx["sfm_sparse_dir"] = str(model_dir)
    ctx["sfm_images_dir"] = str(images_dir)
    ctx["sfm_stats"] = stats
    ctx["sfm_camera_model"] = "OPENCV"
    detail = f"SfM: {stats['registered']}/{n} registered, {stats['points']} points"
    return StageResult(name="sfm", status="done", detail=detail,
                       artifacts=[str(model_dir), str(work_dir / "points.ply")])


def _run_mixed(cfg, colmap: str, groups, masks_dir: Path | None,
               work_dir: Path, ctx: dict) -> StageResult:
    """One mapper, several camera models (drone OPENCV + 360 EQUIRECTANGULAR)."""
    db_path = work_dir / "database.db"
    total = sum(g.count for g in groups)
    existing = _db_image_count(db_path)
    seen = 0
    for g in groups:
        image_dir = Path(g.path)
        folder_n = _count_images(image_dir)
        t_features = _timed_step(
            "sfm.features",
            lambda d=image_dir, model=g.camera_model, until=seen + folder_n: _feature_extract(
                colmap, db_path, d, masks_dir, model, cfg.max_features,
                single_camera_per_folder=False, max_image_size=2048, use_gpu=True,
                complete_at=until))
        if t_features.status != "done":
            return t_features
        seen += folder_n
    t_matching = _timed_step("sfm.matching", lambda: _match(colmap, db_path, total, unordered=True))
    if t_matching.status != "done":
        return t_matching
    images_root = work_dir / "images_all"
    images_root.mkdir(parents=True, exist_ok=True)
    _stage_mixed_images(groups, images_root)
    sparse_dir = work_dir / "sparse"
    sparse_dir.mkdir(parents=True, exist_ok=True)
    t_mapping = _timed_step("sfm.mapping", lambda: _mapper(colmap, db_path, images_root, sparse_dir))
    if t_mapping.status != "done":
        return t_mapping
    model_dir = _latest_model(sparse_dir)
    if model_dir is None:
        return StageResult(name="sfm", status="failed", error="mapper produced no sparse model")
    stats = _analyze(colmap, model_dir)
    _write_points_ply(colmap, model_dir, work_dir / "points.ply")
    text_dir = _write_text_export(colmap, model_dir, work_dir)
    ctx["sfm_sparse_txt_dir"] = str(text_dir)
    _write_preview(work_dir, ctx)
    (work_dir / "stats.json").write_text(json.dumps({
        "mode": "mixed", "groups": [g.id for g in groups],
        "registered": stats["registered"], "total": total,
        "points": stats["points"], "mean_reproj_px": stats["mean_reproj_px"],
        "elapsed": {"matching": t_matching.elapsed_s, "mapping": t_mapping.elapsed_s},
        "reused_features": existing,
    }, indent=2), encoding="utf-8")
    ctx["sfm_sparse_dir"] = str(model_dir)
    ctx["sfm_images_dir"] = str(images_root)
    ctx["sfm_stats"] = stats
    ctx["sfm_camera_model"] = "MIXED"
    ctx["sfm_mixed"] = True
    detail = (
        f"mixed SfM ({'+'.join(g.id for g in groups)}): "
        f"{stats['registered']}/{total} registered, {stats['points']} points"
    )
    return StageResult(name="sfm", status="done", detail=detail,
                       artifacts=[str(model_dir), str(work_dir / "points.ply")])


def _count_images(folder: Path) -> int:
    return len(list(folder.glob("*.jpg"))) + len(list(folder.glob("*.png")))


def _stage_mixed_images(groups, dest: Path) -> None:
    for g in groups:
        for src in Path(g.path).glob("*"):
            if src.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            link = dest / src.name
            if link.exists() or link.is_symlink():
                continue
            try:
                link.hardlink_to(src)
            except OSError:
                import shutil
                shutil.copy2(src, link)


def _timed_step(name: str, fn) -> StageResult:
    import time
    _emit({"stage": name, "status": "running", "progress": 0.0})
    t0 = time.time()
    try:
        ok, detail, error = fn()
    except Exception as exc:  # noqa: BLE001
        ok, detail, error = False, "", f"{type(exc).__name__}: {exc}"
    elapsed = round(time.time() - t0, 1)
    status = "done" if ok else "failed"
    _emit({"stage": name, "status": status, "progress": 1.0, "elapsed_s": elapsed,
           "detail": detail, "error": error})
    return StageResult(name=name, status=status, elapsed_s=elapsed, detail=detail, error=error)


def _feature_extract(colmap: str, db_path: Path, image_dir: Path, mask_dir: Path | None,
                      camera_model: str, max_features: int,
                      single_camera_per_folder: bool = False,
                      max_image_size: int = 4096,
                      use_gpu: bool = True,
                      complete_at: int | None = None) -> tuple[bool, str, str]:
    n = len(list(image_dir.glob("*.jpg"))) + len(list(image_dir.glob("*.png")))
    existing = _db_image_count(db_path)
    target = complete_at if complete_at is not None else n
    if existing >= target > 0:
        return True, f"reused {existing} features", ""
    cmd = [
        colmap, "feature_extractor",
        "--database_path", str(db_path), "--image_path", str(image_dir),
        "--ImageReader.camera_model", camera_model,
        "--FeatureExtraction.use_gpu", "1" if use_gpu else "0",
        "--FeatureExtraction.max_image_size", str(max_image_size),
        "--SiftExtraction.max_num_features", str(max_features),
    ]
    if single_camera_per_folder:
        cmd += ["--ImageReader.single_camera_per_folder", "1"]
    else:
        cmd += ["--ImageReader.single_camera", "1"]
    if mask_dir is not None and mask_dir.exists():
        cmd += ["--ImageReader.mask_path", str(mask_dir)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=7200)
    if proc.returncode != 0:
        return False, "", f"feature_extractor failed: {(proc.stderr or proc.stdout)[-800:]}"
    return True, f"{n} images, {max_features} max features/image", ""


def _match(colmap: str, db_path: Path, image_count: int, unordered: bool = False) -> tuple[bool, str, str]:
    # Unordered photogrammetry (drone stills with hashed names) cannot use
    # sequential matching — that assumes capture order. Vocab-tree matching
    # is the COLMAP default for unordered sets; exhaustive stays for small
    # jobs where the pair count is cheap.
    if unordered:
        if image_count <= 400 or not Path(_VOCAB_TREE).exists():
            cmd = [colmap, "exhaustive_matcher", "--database_path", str(db_path),
                   "--ExhaustiveMatching.block_size", "100",
                   "--FeatureMatching.use_gpu", "1", "--FeatureMatching.num_threads", "16"]
            label = "exhaustive"
        else:
            cmd = [colmap, "vocab_tree_matcher", "--database_path", str(db_path),
                   "--VocabTreeMatching.vocab_tree_path", _VOCAB_TREE,
                   "--FeatureMatching.use_gpu", "1"]
            label = "vocab-tree"
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=14400)
        if proc.returncode != 0:
            return False, "", f"{label} matcher failed: {(proc.stderr or proc.stdout)[-800:]}"
        return True, f"{label} matching on {image_count} unordered images", ""

    if image_count <= _EXHAUSTIVE_MAX:
        cmd = [colmap, "exhaustive_matcher", "--database_path", str(db_path),
               "--ExhaustiveMatching.block_size", "100",
               "--FeatureMatching.use_gpu", "1", "--FeatureMatching.num_threads", "16"]
        label = "exhaustive"
    else:
        cmd = [colmap, "sequential_matcher", "--database_path", str(db_path),
               "--SequentialMatching.overlap", "4", "--SequentialMatching.quadratic_overlap", "0",
               "--SequentialMatching.loop_detection", "1",
               "--SequentialMatching.loop_detection_period", "10",
               "--SequentialMatching.loop_detection_num_images", "30",
               "--SequentialMatching.vocab_tree_path", _VOCAB_TREE,
               "--FeatureMatching.use_gpu", "1"]
        label = "sequential+loop"
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=14400)
    if proc.returncode != 0:
        return False, "", f"{label} matcher failed: {(proc.stderr or proc.stdout)[-800:]}"
    return True, f"{label} matching on {image_count} images", ""


def _mapper(colmap: str, db_path: Path, image_dir: Path, sparse_dir: Path) -> tuple[bool, str, str]:
    cmd = [colmap, "mapper", "--database_path", str(db_path), "--image_path", str(image_dir),
           "--output_path", str(sparse_dir), "--Mapper.num_threads", "16"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=14400)
    if proc.returncode != 0:
        return False, "", f"mapper failed: {(proc.stderr or proc.stdout)[-800:]}"
    return True, "sparse model built", ""


def _db_image_count(db_path: Path) -> int:
    if not db_path.exists():
        return 0
    try:
        import sqlite3
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            row = con.execute("SELECT COUNT(*) FROM images").fetchone()
            return int(row[0]) if row else 0
        finally:
            con.close()
    except Exception:
        return 0


def _latest_model(sparse_dir: Path) -> Path | None:
    models = [d for d in sparse_dir.iterdir() if d.is_dir()] if sparse_dir.exists() else []
    if not models:
        return None
    return sorted(models, key=lambda d: d.name)[0]


def _analyze(colmap: str, model_dir: Path) -> dict:
    proc = subprocess.run([colmap, "model_analyzer", "--path", str(model_dir)],
                          capture_output=True, text=True, timeout=300)
    out = (proc.stdout or "") + (proc.stderr or "")
    registered = _grab_int(out, "Registered images")
    points = _grab_int(out, "Points")
    reproj = _grab_float(out, "Mean reprojection error")
    return {"registered": registered, "points": points, "mean_reproj_px": reproj}


def _grab_int(text: str, label: str) -> int:
    import re
    m = re.search(re.escape(label) + r"\D*(\d[\d,]*)", text)
    return int(m.group(1).replace(",", "")) if m else 0


def _grab_float(text: str, label: str) -> float:
    import re
    m = re.search(re.escape(label) + r"\D*([\d.]+)", text)
    return float(m.group(1)) if m else 0.0


def _write_points_ply(colmap: str, model_dir: Path, out_ply: Path) -> None:
    try:
        subprocess.run([colmap, "model_converter", "--input_path", str(model_dir),
                        "--output_path", str(out_ply), "--output_type", "PLY"],
                       capture_output=True, text=True, timeout=300)
    except Exception:
        pass


def _write_text_export(colmap: str, model_dir: Path, sfm_dir: Path) -> Path:
    """Exports COLMAP's TEXT sparse-model format. This build's BINARY format
    does not match the classic enum this codebase's readers assumed (see
    colmap_io.py's module docstring) - TEXT is stable and well-documented, so
    everything downstream (views.py, sfm_preview.py) reads this, never the
    .bin files directly."""
    out_dir = sfm_dir / "sparse_txt" / "0"
    out_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run([colmap, "model_converter", "--input_path", str(model_dir),
                    "--output_path", str(out_dir), "--output_type", "TXT"],
                   capture_output=True, text=True, timeout=300)
    return out_dir


def _write_preview(work_dir: Path, ctx: dict) -> None:
    try:
        from sfm_preview import write_preview
        preview = write_preview(work_dir, work_dir / "preview.json")
        if preview:
            ctx["sfm_preview"] = str(preview)
    except Exception:
        pass
