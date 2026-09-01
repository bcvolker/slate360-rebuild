"""Equatorial-only cameras + whole-pano holdout. Same lock as Brush / V2. No SfM."""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np

FACES = (
    ("front", 0.0, 0.0),
    ("right", 90.0, 0.0),
    ("back", 180.0, 0.0),
    ("left", 270.0, 0.0),
    ("up", 0.0, 90.0),
    ("down", 0.0, -90.0),
)
EQUATORIAL = ("front", "right", "back", "left")
HOLDOUT_EVERY = 8
FOV_DEG = 90.0


def R_erp_from_face(yaw_deg: float, pitch_deg: float) -> np.ndarray:
    yaw, pitch = math.radians(yaw_deg), math.radians(pitch_deg)
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], dtype=np.float64)
    rp = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]], dtype=np.float64)
    return ry @ rp


def homog(R: np.ndarray) -> np.ndarray:
    T = np.eye(4, dtype=np.float64)
    T[:3, :3] = R
    return T


def c2w_face(c2w_front: np.ndarray, face: str) -> np.ndarray:
    yaw, pitch = next((y, p) for name, y, p in FACES if name == face)
    if face == "front":
        return np.asarray(c2w_front, dtype=np.float64)
    return np.asarray(c2w_front, dtype=np.float64) @ homog(R_erp_from_face(yaw, pitch))


def w2c_from_c2w(c2w: np.ndarray) -> np.ndarray:
    return np.linalg.inv(np.asarray(c2w, dtype=np.float64)).astype(np.float32)


def load_trajectory(path: str | Path) -> list[dict[str, Any]]:
    return json.loads(Path(path).read_text(encoding="utf-8"))["cameras"]


def verify_equatorial_derivation(cameras: list[dict[str, Any]], atol: float = 1e-5) -> dict[str, Any]:
    n = 0
    max_rot = 0.0
    max_t = 0.0
    for rec in cameras:
        front = np.array(rec["c2w_front"], dtype=np.float64)
        by_face = {Path(f["name"]).parts[0]: np.array(f["c2w"], dtype=np.float64) for f in rec["faces"]}
        for face in EQUATORIAL:
            if face not in by_face:
                continue
            derived = c2w_face(front, face)
            stored = by_face[face]
            max_t = max(max_t, float(np.linalg.norm(derived[:3, 3] - stored[:3, 3])))
            max_rot = max(max_rot, float(np.linalg.norm(derived[:3, :3] - stored[:3, :3])))
            n += 1
            if max_t > atol or max_rot > atol * 10:
                raise AssertionError(f"derived {face} diverges from COLMAP (dt={max_t}, dR={max_rot})")
    return {"compared": n, "max_center_delta": max_t, "max_rot_delta": max_rot}


def split_holdout(cameras: list[dict[str, Any]], every: int = HOLDOUT_EVERY) -> dict[str, Any]:
    times = [float(c["t"]) for c in cameras]
    roles = ["holdout" if i % every == 0 else "train" for i in range(len(cameras))]
    hold_times = {t for t, r in zip(times, roles) if r == "holdout"}
    train_times = {t for t, r in zip(times, roles) if r == "train"}
    if hold_times & train_times:
        raise AssertionError("holdout timestamps leaked into train")
    return {
        "n_panos": len(cameras),
        "n_train_panos": len(train_times),
        "n_holdout_panos": len(hold_times),
        "holdout_times": sorted(hold_times),
        "roles": roles,
        "every": every,
    }


def cameras_for_training(cameras: list[dict[str, Any]], face_px: int, roles: list[str]) -> list[dict[str, Any]]:
    fx = 0.5 * face_px / math.tan(math.radians(FOV_DEG) * 0.5)
    cx = (face_px - 1) / 2.0
    k = np.array([[fx, 0, cx], [0, fx, cx], [0, 0, 1]], dtype=np.float32)
    out = []
    for rec, role in zip(cameras, roles):
        front = np.array(rec["c2w_front"], dtype=np.float64)
        for face in EQUATORIAL:
            c2w = c2w_face(front, face)
            out.append({
                "t": float(rec["t"]),
                "face": face,
                "role": role,
                "c2w": c2w.tolist(),
                "view": w2c_from_c2w(c2w).tolist(),
                "K": k.tolist(),
                "w": face_px,
                "h": face_px,
                "name": f"{int(round(float(rec['t']) * 1000)):07d}_{face}.jpg",
            })
    train_panos = {c["t"] for c in out if c["role"] == "train"}
    for cam in out:
        if cam["role"] == "holdout" and cam["t"] in train_panos:
            raise AssertionError("held-out panorama leaked a training face")
    return out


def equatorial_cameras(traj_path: Path, face_px: int, every: int = HOLDOUT_EVERY):
    cams = load_trajectory(traj_path)
    lock = verify_equatorial_derivation(cams)
    split = split_holdout(cams, every=every)
    trained = cameras_for_training(cams, face_px, split["roles"])
    if {c["face"] for c in trained} != set(EQUATORIAL):
        raise AssertionError("expected equatorial faces only")
    if any(c["face"] in {"up", "down"} for c in trained):
        raise AssertionError("nadir/zenith leaked into the Brush-matched split")
    hold_t = {c["t"] for c in trained if c["role"] == "holdout"}
    train_t = {c["t"] for c in trained if c["role"] == "train"}
    if hold_t & train_t:
        raise AssertionError("holdout panorama leaked into train")
    return trained, split, lock
