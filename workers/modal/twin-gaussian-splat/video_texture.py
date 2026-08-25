"""M7-C — texture from the iPhone's VIDEO, not just its depth keyframes.

The capture records depth at roughly one keyframe every 8 cm, but it records
video continuously. On the 2026-08-25 kitchen that is 387 keyframes against
~231 seconds of video — thousands of frames already uploaded and unused, while
37.3% of the mesh had no colour at all.

Those frames have no pose of their own. They get one by interpolating between
the keyframes that bracket them in time, which the capture makes possible by
storing an absolute wall-clock `timestamp` on every keyframe and a `start_time`
on every clip.

Rotation is interpolated with SLERP, not component-wise. Linearly blending two
rotation matrices produces a matrix that is not a rotation at all — it shrinks
and skews — and the resulting camera would sample the wrong pixels while
looking perfectly reasonable in the stats.

numpy (BSD) only for the maths; ffmpeg is invoked as a subprocess for decode.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

# A frame is only posed when the two keyframes bracketing it are CLOSE IN SPACE.
# The first version of this gated on elapsed time, and that was wrong. Measured
# on the 2026-08-25 kitchen, brackets longer than 1 s carry a MEDIAN 29.5 cm of
# travel while brackets under 0.3 s carry 8.2 cm — long gaps are the ones the
# camera moved furthest across, not the ones it sat still through. Time is not a
# proxy for motion here, so gate on the motion itself.
#
# 12 cm / 12 degrees sits just above the capture's own 8 cm / 8 deg keyframe
# rule, so a well-behaved bracket passes and a dropped-keyframe gap does not.
# It bounds the interpolation error directly: a frame halfway through a 12 cm
# bracket cannot be more than ~6 cm from the true path.
MAX_BRACKET_TRANSLATION_M = 0.12
MAX_BRACKET_ROTATION_DEG = 12.0
# A last-resort sanity bound. Motion is the real gate; this only catches a
# bracket spanning a pause so long that the clip timing itself is suspect.
MAX_BRACKET_GAP_S = 3.0
# Sampling rate for extraction. The point is angular coverage the keyframes
# missed, not temporal density; past a few frames per second the extra views
# are near-duplicates that cost raycasts and add nothing.
DEFAULT_SAMPLE_FPS = 4.0


def clip_start_times(poses_data: dict[str, Any]) -> dict[int, float]:
    """Absolute start time per clip index, from the capture's clip metadata.

    Falls back to the session start when a clip lacks its own — better a
    slightly wrong offset that the bracket-gap check will then reject than no
    frames at all.
    """
    session_start = float(poses_data.get("session_start_time") or 0.0)
    out: dict[int, float] = {}
    for clip in poses_data.get("clips") or []:
        if not isinstance(clip, dict):
            continue
        try:
            out[int(clip["index"])] = float(clip.get("start_time") or session_start)
        except (KeyError, TypeError, ValueError):
            continue
    return out


def _rotation_from_transform(transform_4x4: Any):
    import numpy as np

    m = np.asarray(transform_4x4, dtype=float)
    m = m if m.shape == (4, 4) else m.reshape((4, 4), order="F")
    return m[:3, :3], m[:3, 3]


def slerp_rotation(r_a: Any, r_b: Any, t: float):
    """Spherical interpolation between two rotation matrices.

    Via quaternions, taking the short path. A component-wise blend of two
    rotation matrices is not a rotation — it is not orthonormal, it scales and
    shears, and a camera built from it samples the wrong pixels while every
    downstream number still looks plausible.
    """
    import numpy as np

    def to_quat(r):
        tr = float(np.trace(r))
        if tr > 0:
            s = np.sqrt(tr + 1.0) * 2
            return np.array([0.25 * s, (r[2, 1] - r[1, 2]) / s,
                             (r[0, 2] - r[2, 0]) / s, (r[1, 0] - r[0, 1]) / s])
        i = int(np.argmax([r[0, 0], r[1, 1], r[2, 2]]))
        if i == 0:
            s = np.sqrt(1.0 + r[0, 0] - r[1, 1] - r[2, 2]) * 2
            return np.array([(r[2, 1] - r[1, 2]) / s, 0.25 * s,
                             (r[0, 1] + r[1, 0]) / s, (r[0, 2] + r[2, 0]) / s])
        if i == 1:
            s = np.sqrt(1.0 + r[1, 1] - r[0, 0] - r[2, 2]) * 2
            return np.array([(r[0, 2] - r[2, 0]) / s, (r[0, 1] + r[1, 0]) / s,
                             0.25 * s, (r[1, 2] + r[2, 1]) / s])
        s = np.sqrt(1.0 + r[2, 2] - r[0, 0] - r[1, 1]) * 2
        return np.array([(r[1, 0] - r[0, 1]) / s, (r[0, 2] + r[2, 0]) / s,
                         (r[1, 2] + r[2, 1]) / s, 0.25 * s])

    def to_matrix(q):
        w, x, y, z = q / np.linalg.norm(q)
        return np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
            [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
            [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
        ])

    qa, qb = to_quat(np.asarray(r_a, dtype=float)), to_quat(np.asarray(r_b, dtype=float))
    if float(np.dot(qa, qb)) < 0.0:
        qb = -qb                      # short way round
    dot = float(np.clip(np.dot(qa, qb), -1.0, 1.0))
    if dot > 0.9995:
        return to_matrix(qa + (qb - qa) * t)   # near-identical; lerp is stable
    theta = np.arccos(dot)
    s = np.sin(theta)
    return to_matrix((np.sin((1 - t) * theta) / s) * qa + (np.sin(t * theta) / s) * qb)


def interpolate_pose(frames: list[dict[str, Any]], target_time: float):
    """Pose at an arbitrary time, from the keyframes bracketing it.

    `frames` must be sorted by timestamp and belong to ONE clip — interpolating
    across a clip boundary spans a gap where the operator was not recording, and
    the camera did not travel the straight line between them.

    Returns (transform_4x4 column-major list, intrinsics, gap_seconds) or None
    when the target is outside the range or the bracket is too wide to trust.
    """
    import numpy as np

    if len(frames) < 2:
        return None
    times = [float(f["timestamp"]) for f in frames]
    if target_time < times[0] or target_time > times[-1]:
        return None

    hi = int(np.searchsorted(times, target_time))
    hi = max(1, min(hi, len(times) - 1))
    lo = hi - 1
    gap = times[hi] - times[lo]
    if gap <= 0 or gap > MAX_BRACKET_GAP_S:
        return None

    r_lo, p_lo = _rotation_from_transform(frames[lo]["transform_4x4"])
    r_hi, p_hi = _rotation_from_transform(frames[hi]["transform_4x4"])

    # The real gate: how far the camera moved between the two keyframes. Past
    # this the straight line between them is not the path the camera took, and
    # a frame posed on that line paints its pixels onto the wrong surface.
    if float(np.linalg.norm(p_hi - p_lo)) > MAX_BRACKET_TRANSLATION_M:
        return None
    cos_angle = (float(np.trace(r_lo.T @ r_hi)) - 1.0) / 2.0
    if np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0))) > MAX_BRACKET_ROTATION_DEG:
        return None

    t = (target_time - times[lo]) / gap

    m = np.eye(4)
    m[:3, :3] = slerp_rotation(r_lo, r_hi, t)
    m[:3, 3] = p_lo + (p_hi - p_lo) * t
    nearest = frames[lo] if t < 0.5 else frames[hi]
    return (
        [float(v) for v in m.reshape(16, order="F")],
        nearest.get("intrinsics"),
        float(gap),
    )


def extract_frames(video_path: str | Path, out_dir: str | Path, fps: float = DEFAULT_SAMPLE_FPS):
    """Decode video to JPEGs at `fps`. Returns [(path, pts_seconds)] in order.

    ffmpeg is invoked as a subprocess; a missing binary or a failed decode
    returns an empty list rather than raising, so a bad clip cannot fail a job
    that would otherwise produce a good mesh.
    """
    import subprocess

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    pattern = str(out / "vf_%06d.jpg")
    try:
        subprocess.run(
            ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(video_path),
             "-vf", f"fps={fps}", "-q:v", "3", pattern],
            check=True, capture_output=True, timeout=1800,
        )
    except (OSError, subprocess.SubprocessError):
        return []

    files = sorted(out.glob("vf_*.jpg"))
    # ffmpeg's fps filter emits frames on a uniform grid starting at 1/(2*fps).
    return [(f, (i + 0.5) / fps) for i, f in enumerate(files)]


def build_video_frames(
    video_path: str | Path,
    clip_index: int,
    poses_data: dict[str, Any],
    work_dir: str | Path,
    *,
    fps: float = DEFAULT_SAMPLE_FPS,
    max_frames: int = 1200,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Video frames as texturer-ready dicts with interpolated poses.

    Returns (frames, stats). Never raises: a clip with no usable mapping comes
    back empty with a reason, because texture is an enhancement and must not
    cost the geometry.
    """
    stats: dict[str, Any] = {
        "clipIndex": int(clip_index),
        "extracted": 0,
        "posed": 0,
        "droppedNoBracket": 0,
        "skipped": None,
    }

    starts = clip_start_times(poses_data)
    if clip_index not in starts:
        stats["skipped"] = "no_clip_start_time"
        return [], stats

    clip_frames = sorted(
        (f for f in poses_data.get("frames", [])
         if int(f.get("clip_index") or 0) == int(clip_index) and f.get("timestamp") is not None),
        key=lambda f: float(f["timestamp"]),
    )
    if len(clip_frames) < 2:
        stats["skipped"] = "too_few_keyframes_for_clip"
        return [], stats

    decoded = extract_frames(video_path, Path(work_dir) / f"clip{clip_index}", fps=fps)
    stats["extracted"] = len(decoded)
    if not decoded:
        stats["skipped"] = "decode_failed"
        return [], stats

    if len(decoded) > max_frames:
        step = max(1, len(decoded) // max_frames)
        decoded = decoded[::step]

    clip_start = starts[clip_index]
    out: list[dict[str, Any]] = []
    for path, pts in decoded:
        pose = interpolate_pose(clip_frames, clip_start + pts)
        if pose is None:
            stats["droppedNoBracket"] += 1
            continue
        transform, intrinsics, _gap = pose
        if not intrinsics:
            stats["droppedNoBracket"] += 1
            continue
        out.append({
            "path": str(path),
            "transform": transform,
            "intrinsics": intrinsics,
            "source": "video",
            "clipIndex": int(clip_index),
        })

    stats["posed"] = len(out)
    if not out:
        stats["skipped"] = "no_frames_could_be_posed"
    return out, stats
