"""COLMAP/OpenCV camera-to-world -> Nerfstudio OpenGL. Centers stay put."""
from __future__ import annotations

import numpy as np

# Camera-local axes only. Same formula as write_pose_prior_transforms in the
# twin-gaussian-splat worker: OpenCV X-right/Y-down/Z-forward to OpenGL
# X-right/Y-up/Z-back. Translation (camera center) is unchanged.
OPENGL_FROM_COLMAP = np.diag([1.0, -1.0, -1.0, 1.0]).astype(np.float64)


def opencv_c2w_to_opengl(c2w: np.ndarray) -> np.ndarray:
    c2w = np.asarray(c2w, dtype=np.float64)
    if c2w.shape != (4, 4):
        raise ValueError(f"c2w must be 4x4, got {c2w.shape}")
    out = c2w @ OPENGL_FROM_COLMAP
    if not np.allclose(out[:3, 3], c2w[:3, 3]):
        raise AssertionError("OpenGL conversion moved the camera center")
    return out
