#!/usr/bin/env python3
"""Pure-Python FLIR FFF decoder + validator — NO exiftool required.

Verified on a real FLIR R-JPEG (IRX_0110.JPG): reassembles the segmented FLIR APP1
records, parses the FFF record directory, reads the Planck constants from the
camera-params record (type 0x20), and computes ABSOLUTE per-pixel °C from the raw
thermal image (type 0x01) via the Planck equation.

Two uses:
  1. Fallback/standalone decoder when exiftool is unavailable (e.g. the standalone
     app) or when a camera writes Make!="FLIR" but still embeds FLIR FFF data
     (some Autel dual-sensor bodies) — a case extract.py's make-routing misses.
  2. Golden-fixture validator: pass --csv <FLIR Tools per-pixel export> to confirm
     our decode matches FLIR Tools to within tolerance (the scientific-validity gate).

Byte-order note (the subtle part): the FFF record DIRECTORY is big-endian, but the
Planck floats INSIDE the params record are little-endian. The raw image is LE uint16.

Usage:
    python flir_fff_decode.py image.JPG [--csv flir_export.csv] [--tol 0.5]
"""
from __future__ import annotations
import struct
import sys
from pathlib import Path

import numpy as np


def decode_flir(path: Path):
    data = path.read_bytes()
    # 1. Reassemble FLIR APP1 chunks (8-byte "FLIR\0" + type + seq + total header each)
    blob = bytearray()
    i = 2
    while i < len(data) - 1:
        if data[i] != 0xFF:
            break
        m = data[i + 1]
        if m == 0xDA:
            break
        if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7:
            i += 2
            continue
        ln = int.from_bytes(data[i + 2:i + 4], "big")
        seg = data[i + 4:i + 2 + ln]
        if seg[:4] == b"FLIR":
            blob += seg[8:]
        i += 2 + ln
    if blob[:4] != b"FFF\x00":
        raise ValueError(f"no FLIR FFF payload (magic={bytes(blob[:4])!r})")

    # 2. Record directory (big-endian)
    be32 = lambda o: int.from_bytes(blob[o:o + 4], "big")
    idx, num = be32(0x18), be32(0x1c)
    recs = {}
    for r in range(num):
        e = idx + r * 32
        rtype = int.from_bytes(blob[e:e + 2], "big")
        recs.setdefault(rtype, (be32(e + 0x0c), be32(e + 0x10)))

    # 3. Planck constants from params record (type 0x20), little-endian interior
    p = recs[32][0]
    f = lambda o: struct.unpack("<f", blob[o:o + 4])[0]
    params = {
        "emissivity": f(p + 0x20),
        "reflected_c": f(p + 0x28) - 273.15,
        "R1": f(p + 0x58), "B": f(p + 0x5c), "F": f(p + 0x60),
        "O": struct.unpack("<i", blob[p + 0x308:p + 0x30c])[0], "R2": f(p + 0x30c),
    }

    # 4. Raw thermal image (type 0x01), LE uint16, 32-byte record header
    ro, rl = recs[1]
    w = int.from_bytes(blob[ro + 0x02:ro + 0x04], "little")
    h = int.from_bytes(blob[ro + 0x04:ro + 0x06], "little")
    if w * h * 2 > rl:
        w, h = 640, 512
    raw = np.frombuffer(bytes(blob[ro + 0x20:ro + 0x20 + w * h * 2]), "<u2").astype(np.float64)[:w * h]
    R1, R2, B, F, O = params["R1"], params["R2"], params["B"], params["F"], params["O"]
    temp = (B / np.log(np.maximum(R1 / (R2 * (raw + O)) + F, 1e-9)) - 273.15).reshape((h, w)).astype(np.float32)
    return temp, params, (w, h)


def main(argv):
    path = Path(argv[0])
    temp, params, (w, h) = decode_flir(path)
    print(f"{path.name}: {w}x{h}  ABSOLUTE °C  min {temp.min():.1f} / mean {temp.mean():.1f} / max {temp.max():.1f}")
    print(f"  params: {params}")

    # Optional validation against a FLIR Tools per-pixel CSV export
    if "--csv" in argv:
        csv = Path(argv[argv.index("--csv") + 1])
        tol = float(argv[argv.index("--tol") + 1]) if "--tol" in argv else 0.5
        ref = np.loadtxt(csv, delimiter=",")
        if ref.shape != temp.shape:
            print(f"  !! shape mismatch: ours {temp.shape} vs FLIR {ref.shape}")
            return
        diff = np.abs(temp - ref)
        print(f"  vs FLIR Tools CSV: max|Δ| {diff.max():.3f} °C, mean|Δ| {diff.mean():.3f} °C "
              f"-> {'PASS' if diff.max() <= tol else 'FAIL'} (tol {tol})")


if __name__ == "__main__":
    if not sys.argv[1:]:
        print("usage: python flir_fff_decode.py image.JPG [--csv export.csv] [--tol 0.5]")
        sys.exit(1)
    main(sys.argv[1:])
