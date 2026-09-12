"""RTMDet-Ins-S people segmentation (ONNX Runtime).

End-to-end OpenMMLab export:
  input  [1, 3, 640, 640] float32 (MMDet BGR mean/std)
  dets   [1, N, 5]  x1,y1,x2,y2,score in 640-space
  labels [1, N]     COCO class ids (person = 0)
  masks  [1, N, 640, 640]  already sigmoided
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np

PERSON_CLASS = 0
INPUT_SIZE = 640
SCORE_THRESH = 0.4
MAX_MASK_FRAC = 0.18
MODEL_NAME = "rtmdet-ins-s-640.onnx"
MEAN = np.array([103.53, 116.28, 123.675], dtype=np.float32)
STD = np.array([57.375, 57.12, 58.395], dtype=np.float32)


def model_path() -> Path:
    return Path(__file__).resolve().parent / "models" / MODEL_NAME


def _try_torch_cudnn() -> None:
    """ORT CUDA EP wants libcudnn.so.9; the nerfstudio venv ships it via torch."""
    if "cudnn" in os.environ.get("LD_LIBRARY_PATH", ""):
        return
    try:
        import torch
        root = Path(torch.__file__).resolve().parent.parent / "nvidia"
        extras = [root / "cudnn" / "lib", root / "cublas" / "lib", root / "cuda_runtime" / "lib"]
        found = [str(p) for p in extras if p.is_dir()]
        if found:
            cur = os.environ.get("LD_LIBRARY_PATH", "")
            os.environ["LD_LIBRARY_PATH"] = ":".join(found + ([cur] if cur else []))
    except Exception:
        pass


def load_session():
    if not model_path().exists():
        raise FileNotFoundError(f"RTMDet model missing: {model_path()}")
    _try_torch_cudnn()
    import onnxruntime as ort
    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    available = ort.get_available_providers()
    use = [p for p in providers if p in available] or ["CPUExecutionProvider"]
    return ort.InferenceSession(str(model_path()), providers=use)


def preprocess(rgb: np.ndarray) -> np.ndarray:
    """Resize RGB uint8 → MMDet BGR-normalized NCHW float32."""
    import cv2
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    resized = cv2.resize(bgr, (INPUT_SIZE, INPUT_SIZE), interpolation=cv2.INTER_LINEAR)
    norm = (resized.astype(np.float32) - MEAN) / STD
    return norm.transpose(2, 0, 1)[None]


def people_mask(session, rgb: np.ndarray, dilate_px: int = 32) -> np.ndarray:
    """Return uint8 mask (255 = keep, 0 = person) at the original resolution.

    Dilate in source pixels after upsampling so an 8K frame does not grow a
    640-space kernel into a 180px blob that eats furniture.
    """
    import cv2
    h, w = rgb.shape[:2]
    outs = session.run(None, {"input": preprocess(rgb)})
    dets, labels, masks = outs[0], outs[1], outs[2]
    if dets.ndim == 3:
        dets, labels, masks = dets[0], labels[0], masks[0]
    keep = np.ones((INPUT_SIZE, INPUT_SIZE), dtype=np.uint8) * 255
    if dets.size == 0:
        return cv2.resize(keep, (w, h), interpolation=cv2.INTER_NEAREST)
    scores = dets[:, 4] if dets.shape[-1] >= 5 else np.zeros(len(dets))
    area = INPUT_SIZE * INPUT_SIZE
    for i, (det, score, label) in enumerate(zip(dets, scores, labels)):
        if int(label) != PERSON_CLASS or float(score) < SCORE_THRESH:
            continue
        inst = masks[i] > 0.5
        if det.shape[-1] >= 4:
            x1, y1, x2, y2 = [int(v) for v in det[:4]]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(INPUT_SIZE, x2), min(INPUT_SIZE, y2)
            box = np.zeros_like(inst)
            box[y1:y2, x1:x2] = True
            inst = np.logical_and(inst, box)
        if inst.mean() > MAX_MASK_FRAC or inst.sum() == 0:
            continue
        keep[inst] = 0
    keep = cv2.resize(keep, (w, h), interpolation=cv2.INTER_NEAREST)
    if dilate_px > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_px, dilate_px))
        keep = cv2.erode(keep, k)
    return keep


def apply_mask(rgb: np.ndarray, keep: np.ndarray) -> np.ndarray:
    """Black out masked pixels so SfM does not extract operator features."""
    out = rgb.copy()
    out[keep == 0] = 0
    return out
