"""Unit tests for RTMDet preprocess / mask apply (no ONNX required)."""
from __future__ import annotations

import numpy as np
from rtmdet import INPUT_SIZE, apply_mask, preprocess


def test_preprocess_shape() -> None:
    rgb = np.zeros((480, 640, 3), dtype=np.uint8)
    rgb[100:200, 200:300] = (30, 40, 200)
    t = preprocess(rgb)
    assert t.shape == (1, 3, INPUT_SIZE, INPUT_SIZE)
    assert t.dtype == np.float32


def test_apply_mask_blacks_out_people() -> None:
    rgb = np.ones((8, 8, 3), dtype=np.uint8) * 200
    keep = np.ones((8, 8), dtype=np.uint8) * 255
    keep[2:5, 2:5] = 0
    out = apply_mask(rgb, keep)
    assert out[3, 3].tolist() == [0, 0, 0]
    assert out[0, 0].tolist() == [200, 200, 200]


if __name__ == "__main__":
    test_preprocess_shape()
    test_apply_mask_blacks_out_people()
    print("ok")
