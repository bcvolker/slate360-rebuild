"""Room 213 detail diagnostic, stage A-vs-B numeric check (CPU, no GPU): does the exported splat.ply carry exactly the
parameters of the saved terminal state (state.tar)? Re-applies Spirula fd1afca1's export filter
(src/engine/EngineCheckpoint.cpp: NaN/Inf, opacity logit < -5.5373, max log-scale <= -40) and decodes the 16-bit FPBO
SH value store (src/core/Tensor.h ShQuantAddr / sh_fpbo_cells) with the writer's own formula.

usage: python state_vs_ply.py <state.tar> <splat.ply> <out.json>"""
import io
import json
import sys
import tarfile

import numpy as np


def read_state(path):
    out = {}
    with tarfile.open(path) as tf:
        for m in tf.getmembers():
            b = tf.extractfile(m).read()
            if m.name == "state.json":
                out["state.json"] = json.loads(b)
            elif m.name.endswith(".npy"):
                out[m.name[:-4]] = np.load(io.BytesIO(b), allow_pickle=False)
    return out


def read_ply(path):
    raw = open(path, "rb").read()
    end = raw.find(b"end_header\n") + 11
    hdr = raw[:end].decode().splitlines()
    n = int([l for l in hdr if l.startswith("element vertex")][0].split()[-1])
    names = [l.split()[-1] for l in hdr if l.startswith("property")]
    types = sorted({l.split()[1] for l in hdr if l.startswith("property")})
    a = np.frombuffer(raw, "<f4", count=n * len(names), offset=end).reshape(n, len(names))
    return hdr, names, types, a


def decode_sh16_fpbo(q, qb, N, K):
    """value = lo + (hi-lo) * q/65535, cell c = 3*j + ch, FPBO: base = (g>>8)*((R+1)>>1)*512 + (g&255)*2,
    cell = base + (c>>1)*512 + (c&1); one float2 bound per 256-splat block (bounds_stride = ((R+1)>>1)*512)."""
    R = 3 * K
    q = q.reshape(-1).view(np.uint16) if q.dtype != np.uint16 else q.reshape(-1)
    qb = qb.reshape(-1, 2).astype(np.float64)
    g = np.arange(N, dtype=np.int64)
    base = (g >> 8) * ((R + 1) >> 1) * 512 + (g & 255) * 2
    stride = ((R + 1) >> 1) * 512
    out = np.zeros((N, K, 3), np.float64)
    for j in range(K):
        for ch in range(3):
            c = 3 * j + ch
            cell = base + (c >> 1) * 512 + (c & 1)
            b = qb[cell // stride]
            out[:, j, ch] = b[:, 0] + (b[:, 1] - b[:, 0]) * (q[cell].astype(np.float64) / 65535.0)
    return out


def main(state_path, ply_path, out_path):
    st = read_state(state_path)
    sj = st["state.json"]
    N = int(sj["cur_num_splats"]); K = int(sj["num_sh"])
    means = st["world.means"].reshape(-1, 3)[:N]; quats = st["world.quats"].reshape(-1, 4)[:N]
    scales = st["world.scales"].reshape(-1, 3)[:N]; opac = st["world.opacities"].reshape(-1)[:N]
    dc = st["world.features_dc"].reshape(-1, 3)[:N]
    shk = [k for k in st if "sh_vq16_fpbo.q" == k[-len("sh_vq16_fpbo.q"):]]
    sh = decode_sh16_fpbo(st[shk[0]], st[shk[0] + "b"], N, K).astype(np.float32)
    fin = np.isfinite(means).all(1) & np.isfinite(quats).all(1) & np.isfinite(scales).all(1) & np.isfinite(opac) \
        & np.isfinite(dc).all(1)
    keep = fin & ~(opac < -5.5373) & ~(scales.max(1) <= -40.0)
    hdr, names, types, P = read_ply(ply_path)
    col = {n: i for i, n in enumerate(names)}
    res = {"stateJson": sj, "stateCurNumSplats": N, "numShRestPerChannel": K,
           "impliedShDegree": int(round((K + 1) ** 0.5)) - 1,
           "exportFilter": {"nonFinite": int((~fin).sum()), "lowOpacity": int((fin & (opac < -5.5373)).sum()),
                            "deadScale": int((fin & ~(opac < -5.5373) & (scales.max(1) <= -40)).sum()),
                            "kept": int(keep.sum())},
           "ply": {"vertices": int(P.shape[0]), "properties": len(names), "propertyTypes": types,
                   "fRestCount": sum(n.startswith("f_rest_") for n in names), "header": hdr}}
    if P.shape[0] != keep.sum():
        res["countMismatch"] = True
    else:
        sel = np.nonzero(keep)[0]
        cmp = {}

        def c(name, a, b):
            d = np.abs(a.astype(np.float64) - b.astype(np.float64))
            cmp[name] = {"maxAbsDiff": float(d.max()), "bitExact": bool((a.astype(np.float32) == b.astype(np.float32)).all())}
        c("means(x,y,z)", means[sel], P[:, [col["x"], col["y"], col["z"]]])
        c("quats(rot_0..3 = w,x,y,z)", quats[sel], P[:, [col[f"rot_{i}"] for i in range(4)]])
        c("scales(log)", scales[sel], P[:, [col[f"scale_{i}"] for i in range(3)]])
        c("opacity(logit)", opac[sel], P[:, col["opacity"]])
        c("f_dc", dc[sel], P[:, [col[f"f_dc_{i}"] for i in range(3)]])
        ply_sh = P[:, [col[f"f_rest_{i}"] for i in range(3 * K)]].reshape(-1, 3, K).transpose(0, 2, 1)
        c("f_rest (channel-major r0..,g0..,b0..) vs decoded 16-bit state", sh[sel], ply_sh)
        cmp["normals"] = {"allZero": bool((P[:, [col["nx"], col["ny"], col["nz"]]] == 0).all())}
        res["stateVsPly"] = cmp
        res["plyStats"] = {"opacitySigmoid_p10_50_90": np.percentile(1 / (1 + np.exp(-P[:, col["opacity"]])), [10, 50, 90]).round(4).tolist(),
                           "maxScaleExp_p10_50_90": np.percentile(np.exp(P[:, [col[f"scale_{i}"] for i in range(3)]]).max(1), [10, 50, 90]).tolist(),
                           "quatNorm_min_max": [float(np.linalg.norm(P[:, [col[f"rot_{i}"] for i in range(4)]], axis=1).min()),
                                                float(np.linalg.norm(P[:, [col[f"rot_{i}"] for i in range(4)]], axis=1).max())],
                           "shRestAbs_p99_by_band": [float(np.percentile(np.abs(ply_sh[:, a:b]), 99)) for a, b in ((0, 3), (3, 8), (8, 15))]}
    json.dump(res, open(out_path, "w"), indent=1, default=str)
    print(json.dumps({k: v for k, v in res.items() if k not in ("stateJson",)}, indent=1, default=str)[:4000])


if __name__ == "__main__":
    main(*sys.argv[1:4])
