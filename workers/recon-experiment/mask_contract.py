"""Mask fail-closed + content-hash invalidation for the frozen Room experiment."""
from __future__ import annotations

import json
from pathlib import Path

from hashes import sha256_dir, sha256_file, sha256_json


class MaskContractError(RuntimeError):
    pass


def mask_set_hash(masks_dir: Path) -> str:
    return sha256_dir(Path(masks_dir), ("*.png",))


def require_masks(images: list[Path], masks_dir: Path, *, required: bool) -> dict:
    if not required:
        return {"required": False, "ok": True, "missing": [], "mismatched": []}
    masks_dir = Path(masks_dir)
    missing = []
    mismatched = []
    for image in images:
        stem_mask = masks_dir / f"{image.stem}.png"
        name_mask = masks_dir / f"{image.name}.png"
        mask = stem_mask if stem_mask.is_file() else name_mask
        if not mask.is_file():
            missing.append(image.name)
            continue
        if mask.stat().st_size < 8:
            mismatched.append({"image": image.name, "mask": mask.name, "reason": "empty"})
    if missing or mismatched:
        raise MaskContractError(
            json.dumps({"missing": missing[:20], "mismatched": mismatched[:20], "n_missing": len(missing)})
        )
    return {
        "required": True,
        "ok": True,
        "count": len(images),
        "mask_hash": mask_set_hash(masks_dir),
    }


def view_cache_fingerprint(mask_hash: str, pose_hash: str, layout: object) -> str:
    return sha256_json({"mask_hash": mask_hash, "pose_hash": pose_hash, "layout": layout})


def cache_is_valid(meta_path: Path, fingerprint: str) -> bool:
    path = Path(meta_path)
    if not path.is_file():
        return False
    try:
        got = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return got.get("fingerprint") == fingerprint


def write_cache_meta(meta_path: Path, fingerprint: str, extra: dict | None = None) -> None:
    payload = {"fingerprint": fingerprint}
    if extra:
        payload.update(extra)
    Path(meta_path).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def corresponding_view_mask(view_stem: str, view_masks: Path) -> Path:
    return Path(view_masks) / f"{view_stem}.png"


def audit_correspondence(view_id: str, mask_file: Path, derived_view_ids: list[str]) -> dict:
    return {
        "panorama_id": view_id,
        "mask_file": str(mask_file),
        "mask_sha256": sha256_file(mask_file) if Path(mask_file).is_file() else None,
        "derived_view_ids": derived_view_ids,
    }
