#!/usr/bin/env python3
"""Standalone Autel (and any-camera) radiometric decode probe.

Run this on ONE original R-JPEG straight off the drone (NOT a preview/screenshot)
to learn, before committing a whole flight to the pipeline, whether the file yields
a usable per-pixel temperature grid — and whether it is ABSOLUTE or RELATIVE.

It mirrors the real logic in extract.py (detect_sensor / pick_extraction_tags /
autel_raw_to_celsius / extract_raw_matrix) and ADDS one check extract.py doesn't:
Autel's dual-sensor bodies sometimes embed FLIR-style Planck radiometric data that
FLIR Tools reads — if Planck constants are present we can get ABSOLUTE °C even on an
AUTEL file, which is strictly better than the ambient-delta heuristic.

Usage:
    python test_autel_decode.py /path/to/DJI_or_AUTEL_or_FLIR.JPG

Requires: exiftool on PATH, numpy. (Pillow only if a tag holds a PNG/TIFF grid.)
"""
from __future__ import annotations
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np


def sh_json(path: Path) -> dict:
    """All named tags as JSON (NO -b: binary in JSON corrupts the parse — Grok's bug)."""
    out = subprocess.run(
        ["exiftool", "-j", "-n", "-a", "-G1", str(path)],
        capture_output=True, text=True,
    ).stdout
    try:
        return json.loads(out)[0] if out.strip() else {}
    except json.JSONDecodeError:
        return {}


def sh_binary(path: Path, tag: str) -> bytes:
    """Extract one binary tag as raw bytes (mirrors extract_binary_tag in extract.py)."""
    return subprocess.run(
        ["exiftool", "-b", f"-{tag}", str(path)],
        capture_output=True,
    ).stdout or b""


def find_meta(meta: dict, *names: str):
    low = {k.lower(): v for k, v in meta.items()}
    for name in names:
        t = name.lower()
        for k, v in low.items():
            if k.endswith(t) or t in k:
                try:
                    return float(v)
                except (TypeError, ValueError):
                    continue
    return None


def main(path: Path) -> None:
    print(f"\n=== Radiometric decode probe: {path.name} ===\n")
    meta = sh_json(path)
    if not meta:
        print("!! exiftool returned nothing — is exiftool installed and the file valid?")
        return

    make = str(meta.get("EXIF:Make") or meta.get("Make") or "Unknown")
    model = str(meta.get("EXIF:Model") or meta.get("Model") or "Unknown")
    um, umod = make.upper(), model.upper()
    profile = ("dji" if "DJI" in um or "DJI" in umod
               else "autel" if "AUTEL" in um
               else "flir" if "FLIR" in um else "generic")
    print(f"Make/Model : {make} / {model}")
    print(f"Profile    : {profile}")

    # --- Which binary thermal block is actually present? (the make-or-break question) ---
    tag_order = {
        "dji": ["ThermalData", "ThermalImage", "EmbeddedImage"],
        "autel": ["ThermalData", "EmbeddedImage", "RawThermalImage"],
        "flir": ["RawThermalImage", "ThermalImage", "ThermalData"],
    }.get(profile, ["RawThermalImage", "ThermalImage", "ThermalData", "EmbeddedImage"])

    raw_bytes, used_tag = b"", None
    print("\nBinary thermal blocks:")
    for tag in tag_order:
        b = sh_binary(path, tag)
        print(f"  {tag:<18} {len(b):>10,} bytes")
        if len(b) > 1024 and not raw_bytes:
            raw_bytes, used_tag = b, tag

    # --- Planck (absolute) check — the bonus path extract.py skips for AUTEL ---
    planck_r1 = find_meta(meta, "PlanckR1")
    planck_b = find_meta(meta, "PlanckB")
    has_planck = planck_r1 is not None and planck_b is not None
    ambient = find_meta(meta, "AmbientTemperature", "AtmosphericTemperature",
                        "ReflectedApparentTemperature")
    emis = find_meta(meta, "Emissivity", "ObjectEmissivity")
    print(f"\nPlanck constants present : {has_planck}  (R1={planck_r1}, B={planck_b})")
    print(f"Ambient temperature tag  : {ambient}")
    print(f"Emissivity tag           : {emis}")

    if not raw_bytes:
        print("\n>>> VERDICT: NO extractable thermal block. This file will decode as "
              "is_radiometric=False in extract.py — no grid at all.")
        print(">>> If FLIR Tools CAN read it, the data is in a proprietary segment "
              "exiftool doesn't surface as a named tag. Bring me the file + the "
              "FLIR Tools reading and we find the block offset.")
        return

    # --- Dimensions (mirror infer_dimensions) ---
    w = find_meta(meta, "ThermalImageWidth") or find_meta(meta, "ImageWidth")
    h = find_meta(meta, "ThermalImageHeight") or find_meta(meta, "ImageHeight")
    if not (w and h):
        w, h = (640, 512)  # Autel EVO II Dual 640T native
        if w * h * 2 > len(raw_bytes):
            side = int(math.sqrt(len(raw_bytes) // 2))
            w = h = side
    w, h = int(w), int(h)

    arr = np.frombuffer(raw_bytes, dtype=np.uint16)
    if arr.size < w * h:
        print(f"\n>>> Block too small for {w}x{h} ({arr.size} < {w*h}). "
              "Dimensions guess is wrong — inspect ThermalImageWidth/Height tags.")
        return
    raw = arr[:w * h].reshape((h, w)).astype(np.float32)

    # --- Decode, preferring ABSOLUTE where possible ---
    if has_planck:
        s = raw.astype(np.float64)
        r2 = find_meta(meta, "PlanckR2") or 1.0
        f = find_meta(meta, "PlanckF") or 1.0
        o = find_meta(meta, "PlanckO") or 0.0
        temp = (planck_b / np.log(np.maximum(planck_r1 / (r2 * (s + o)) + f, 1e-9))
                - 273.15).astype(np.float32)
        absolute, parser = True, "flir_planck(on-autel)"
    elif ambient is not None:
        span = float(np.percentile(raw, 99) - np.percentile(raw, 1)) or 1.0
        delta = (raw - float(np.median(raw))) * (40.0 / span)
        temp = (ambient + delta / max(emis or 0.91, 0.05)).astype(np.float32)
        absolute, parser = False, "autel_ambient_delta"
    else:
        temp = raw
        absolute, parser = False, "raw_counts(relative)"

    print(f"\n--- Decoded grid ---")
    print(f"parser_id  : {parser}")
    print(f"shape      : {temp.shape}  (used tag: {used_tag})")
    print(f"min/mean/max: {float(temp.min()):.2f} / {float(temp.mean()):.2f} / {float(temp.max()):.2f}")
    print(f"absolute_celsius: {absolute}")

    # --- Suitability for the hardened moisture detector ---
    print("\n--- Moisture-detector suitability ---")
    if absolute:
        print("ABSOLUTE grid: the calibrated °C moisture thresholds (1.0–3.5 °C) are valid.")
    else:
        print("RELATIVE grid: local-contrast detection STILL WORKS (moisture is a local")
        print("anomaly, and the mapping is monotonic), BUT the fixed °C thresholds are NOT")
        print("physically meaningful. Use the SIGMA-relative path (n*robust_sigma), and")
        print("label every output 'Relative ΔT only'. Do NOT report absolute temperatures.")
    print("\nDone.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python test_autel_decode.py <image.jpg>")
        sys.exit(1)
    main(Path(sys.argv[1]))
