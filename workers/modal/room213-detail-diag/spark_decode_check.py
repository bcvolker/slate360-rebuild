"""Spark 2.1.0 decode check: the first 4096 splats of an exported PLY as Spark's ExtSplats hold them (SplatMesh
extSplats:true, LoD off so the order is file order; dumped by spark/index.html?decode=1) vs the PLY values.
Spark ext encoding: centre fp32, opacity/rgb fp16, log-scales fp16, quaternion oct 10/10/12 bits; each SH coefficient
RGB triplet = shared 5-bit exponent + 3 x 8-bit magnitude + signs (encodeExtRgb / decodeExtRgb).
Spark SH slots: sh1 = [sh1_0, sh1_1, sh1_2, sh2_0], sh2 = [sh2_1..sh2_4], sh3a = [sh3_0..sh3_3], sh3b = [sh3_4..sh3_6, -].

usage: python spark_decode_check.py <splat.ply> <decoded.json> <out.json>"""
import json
import sys

import numpy as np

sys.path.insert(0, __file__.rsplit("\\", 1)[0] if "\\" in __file__ else __file__.rsplit("/", 1)[0])
from state_vs_ply import read_ply  # noqa: E402


def decode_ext_rgb(u):
    u = np.asarray(u, np.uint64)
    base = (u >> 27) & 31
    div = np.power(2.0, base.astype(np.float64) - 15) / 255.0
    out = np.stack([(u & 255), (u >> 8) & 255, (u >> 16) & 255], -1).astype(np.float64) * div[..., None]
    sg = np.stack([(u >> 24) & 1, (u >> 25) & 1, (u >> 26) & 1], -1).astype(bool)
    out[sg] *= -1
    return out


def main(ply, dec_path, out_path):
    _, names, _, P = read_ply(ply)
    col = {n: i for i, n in enumerate(names)}
    d = json.load(open(dec_path))
    dec = np.array(d["dec"], np.float64)
    n = len(dec)
    P = P[:n].astype(np.float64)
    res = {"n": n}
    res["centreMaxAbs"] = float(np.abs(dec[:, 0:3] - P[:, [col["x"], col["y"], col["z"]]]).max())
    ls = np.log(np.maximum(dec[:, 3:6], 1e-30)) - P[:, [col[f"scale_{i}"] for i in range(3)]]
    res["logScaleMaxAbs"] = float(np.abs(ls).max())
    q_ply = P[:, [col[f"rot_{i}"] for i in range(4)]]
    q_ply = q_ply / np.linalg.norm(q_ply, axis=1, keepdims=True)
    q_sp = dec[:, [9, 6, 7, 8]]                                   # three (x,y,z,w) -> (w,x,y,z)
    res["quatAngleErrDeg_max_p99"] = [float(v) for v in np.degrees(2 * np.arccos(np.clip(np.abs((q_ply * q_sp).sum(1)), 0, 1)))[[0]].tolist()] and \
        [float(np.degrees(2 * np.arccos(np.clip(np.abs((q_ply * q_sp).sum(1)), 0, 1))).max()),
         float(np.percentile(np.degrees(2 * np.arccos(np.clip(np.abs((q_ply * q_sp).sum(1)), 0, 1))), 99))]
    op = 1 / (1 + np.exp(-P[:, col["opacity"]]))
    res["opacityMaxAbs"] = float(np.abs(dec[:, 10] - op).max())
    dc = 0.5 + 0.28209479177387814 * P[:, [col[f"f_dc_{i}"] for i in range(3)]]
    res["dcColourMaxAbs(0.5+C0*f_dc)"] = float(np.abs(dec[:, 11:14] - dc).max())
    K = 15
    sh = P[:, [col[f"f_rest_{i}"] for i in range(3 * K)]].reshape(n, 3, K).transpose(0, 2, 1)   # [n, coeff, rgb]
    ex = {k: np.array(v, np.uint64).reshape(-1, 4)[:n] for k, v in d["extra"].items()}
    sp = np.zeros((n, K, 3))
    sp[:, 0:3] = decode_ext_rgb(ex["sh1"][:, 0:3]); sp[:, 3] = decode_ext_rgb(ex["sh1"][:, 3])
    sp[:, 4:8] = decode_ext_rgb(ex["sh2"][:, 0:4])
    sp[:, 8:12] = decode_ext_rgb(ex["sh3a"][:, 0:4]); sp[:, 12:15] = decode_ext_rgb(ex["sh3b"][:, 0:3])
    err = np.abs(sp - sh)
    res["shCoeffMaxAbs_by_band"] = {"deg1": float(err[:, 0:3].max()), "deg2": float(err[:, 3:8].max()),
                                    "deg3": float(err[:, 8:15].max())}
    res["shCoeffP99Abs"] = float(np.percentile(err, 99))
    res["shNonzeroBandsPresent"] = {"deg1": bool(np.abs(sp[:, 0:3]).max() > 0), "deg2": bool(np.abs(sp[:, 3:8]).max() > 0),
                                    "deg3": bool(np.abs(sp[:, 8:15]).max() > 0)}
    json.dump(res, open(out_path, "w"), indent=1)
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main(*sys.argv[1:4])
