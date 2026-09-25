"""Room 213 detail diagnostic, footprint instrumentation (CPU, no renderer change).

A small reference rasterizer for ONE crop of ONE pinhole view that re-implements, from the installed sources, the two
per-pixel models the product path actually uses, so contributor-level quantities (projected footprints, weights,
opacity) can be measured on exactly the splats that make the carpet pixels:

  mode "spirula3dgut"  Spirula fd1afca1 primitive 3dgut, eval path (shaders/projection_utils.slang
                       evaluate_alpha_3dgs + kernels/raster/RasterizationEval3DFwd_kernel.cuh):
                       alpha = sigmoid(o) * exp(-0.5 |g_d x g_o|^2 / |g_d|^2), g = S^-1 R^T (ray-to-centre Mahalanobis
                       distance, i.e. the maximum response along the pixel-centre ray). NO 2D dilation, no compensation.
                       Skip alpha <= 1/255; front to back in camera-z order; a pixel stops once T would fall <= 1e-4.
                       Colour = max(SH3(view dir from camera centre) + 0.5, 0). Float accumulation.
  mode "spark"         Spark 2.1.0 (dist/spark.module.js splatVertex/splatFragment): EWA Jacobian at the centre,
                       cov2d + preBlur, then + blurAmount with alpha *= sqrt(detOrig / det) (compensation), cull if
                       alpha < minAlpha (0.5/255), quad clipped at maxStdDev = sqrt(8) (discard z^2 > 8),
                       alpha = a * exp(-0.5 z^2); back to front by radial distance (sortRadial); premultiplied
                       blending ONE, ONE_MINUS_SRC_ALPHA into an RGBA8 target (rounded after every splat).
Variants toggle one factor at a time (blur, compensation, cutoff, 8-bit target, projection, sort) for attribution.

The model is validated against the real renders of the same crop before any attribution is reported.
usage: python cpu_raster.py <dd dir> <out json>"""
import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from state_vs_ply import read_ply  # noqa: E402

SH_C0 = 0.28209479177387814
SH_C1 = 0.4886025119029199
SH_C2 = [1.0925484305920792, -1.0925484305920792, 0.31539156525252005, -1.0925484305920792, 0.5462742152960396]
SH_C3 = [-0.5900435899266435, 2.890611442640554, -0.4570457994644658, 0.3731763325901154, -0.4570457994644658,
         1.445305721320277, -0.5900435899266435]


def load_model(ply):
    _, names, _, P = read_ply(ply)
    c = {n: i for i, n in enumerate(names)}
    m = {"X": P[:, [c["x"], c["y"], c["z"]]].astype(np.float64),
         "ls": P[:, [c[f"scale_{i}"] for i in range(3)]].astype(np.float64),
         "q": P[:, [c[f"rot_{i}"] for i in range(4)]].astype(np.float64),
         "o": 1 / (1 + np.exp(-P[:, c["opacity"]].astype(np.float64))),
         "dc": P[:, [c[f"f_dc_{i}"] for i in range(3)]].astype(np.float64),
         "sh": P[:, [c[f"f_rest_{i}"] for i in range(45)]].astype(np.float64).reshape(-1, 3, 15).transpose(0, 2, 1)}
    m["q"] /= np.linalg.norm(m["q"], axis=1, keepdims=True)
    return m


def oct88r8(q):
    """Spark encodeQuatOctXy88R8 -> decodeQuatOctXy88R8 (splatDefines), q as (w, x, y, z)."""
    q = np.where(q[:, :1] < 0, -q, q)
    w = np.clip(q[:, 0], -1, 1); v = q[:, 1:]
    theta = 2 * np.arccos(w); s = np.sin(theta / 2)
    axis = np.where(np.abs(s)[:, None] < 1e-6, np.array([[1.0, 0, 0]]), v / np.where(np.abs(s) < 1e-6, 1, s)[:, None])
    sm = np.abs(axis).sum(1)
    px, py = axis[:, 0] / sm, axis[:, 1] / sm
    neg = axis[:, 2] < 0
    opx = px.copy()
    px = np.where(neg, (1 - np.abs(py)) * np.where(px >= 0, 1, -1), px)
    py = np.where(neg, (1 - np.abs(opx)) * np.where(py >= 0, 1, -1), py)
    qu = np.clip(np.round((px * 0.5 + 0.5) * 255), 0, 255); qv = np.clip(np.round((py * 0.5 + 0.5) * 255), 0, 255)
    qa = np.clip(np.round(theta / math.pi * 255), 0, 255)
    f = np.stack([qu / 255 * 2 - 1, qv / 255 * 2 - 1], 1)
    ax = np.stack([f[:, 0], f[:, 1], 1 - np.abs(f[:, 0]) - np.abs(f[:, 1])], 1)
    t = np.maximum(-ax[:, 2], 0)
    ax[:, 0] += np.where(ax[:, 0] >= 0, -t, t); ax[:, 1] += np.where(ax[:, 1] >= 0, -t, t)
    ax /= np.linalg.norm(ax, axis=1, keepdims=True)
    th = qa / 255 * math.pi
    return np.concatenate([np.cos(th / 2)[:, None], ax * np.sin(th / 2)[:, None]], 1)


def spark_packed(m):
    """Spark 2.1.0 SplatAccumulator default (accumExtSplats false) = packSplatEncoding: centre float16 (world frame
    of the SparkRenderer, which sits at the origin), ln-scale 8 bit over [-12, 9], quaternion oct 8/8 + 8-bit angle,
    rgb 8 bit clamped to [0, 1] (applied in raster), alpha stored as a/2 in 8 bits."""
    q = dict(m)
    q["X"] = m["X"].astype(np.float16).astype(np.float64)
    u = np.clip(np.round((m["ls"] + 12.0) * 254 / 21.0), 0, 254)
    q["ls"] = -12.0 + u * 21.0 / 254
    q["q"] = oct88r8(m["q"])
    q["o"] = np.round(np.clip(m["o"] / 2, 0, 1) * 255) / 255 * 2
    q["packed"] = True
    return q


def quat_R(q):
    w, x, y, z = q[:, 0], q[:, 1], q[:, 2], q[:, 3]
    R = np.empty((len(q), 3, 3))
    R[:, 0, 0] = 1 - 2 * (y * y + z * z); R[:, 0, 1] = 2 * (x * y - w * z); R[:, 0, 2] = 2 * (x * z + w * y)
    R[:, 1, 0] = 2 * (x * y + w * z); R[:, 1, 1] = 1 - 2 * (x * x + z * z); R[:, 1, 2] = 2 * (y * z - w * x)
    R[:, 2, 0] = 2 * (x * z - w * y); R[:, 2, 1] = 2 * (y * z + w * x); R[:, 2, 2] = 1 - 2 * (x * x + y * y)
    return R


def sh_color(dc, sh, d, offset=True):
    x, y, z = d[:, 0:1], d[:, 1:2], d[:, 2:3]
    xx, yy, zz, xy, yz, xz = x * x, y * y, z * z, x * y, y * z, x * z
    r = SH_C0 * dc
    r = r - SH_C1 * y * sh[:, 0] + SH_C1 * z * sh[:, 1] - SH_C1 * x * sh[:, 2]
    r = r + SH_C2[0] * xy * sh[:, 3] + SH_C2[1] * yz * sh[:, 4] + SH_C2[2] * (2 * zz - xx - yy) * sh[:, 5] \
        + SH_C2[3] * xz * sh[:, 6] + SH_C2[4] * (xx - yy) * sh[:, 7]
    r = r + SH_C3[0] * y * (3 * xx - yy) * sh[:, 8] + SH_C3[1] * xy * z * sh[:, 9] \
        + SH_C3[2] * y * (4 * zz - xx - yy) * sh[:, 10] + SH_C3[3] * z * (2 * zz - 3 * xx - 3 * yy) * sh[:, 11] \
        + SH_C3[4] * x * (4 * zz - xx - yy) * sh[:, 12] + SH_C3[5] * z * (xx - yy) * sh[:, 13] \
        + SH_C3[6] * x * (xx - 3 * yy) * sh[:, 14]
    return r + 0.5


def prepare(m, view, crop, margin=48):
    Rc2w = np.array(view["c2w_R"]); C = np.array(view["C"]); f = float(view["f"])
    W, H = view.get("W", 1280), view.get("H", 720); cx, cy = W / 2, H / 2
    Rw = Rc2w.T
    Xc = (m["X"] - C) @ Rw.T
    z = Xc[:, 2]
    ok = z > 0.02
    u = f * Xc[:, 0] / np.where(ok, z, 1) + cx
    v = f * Xc[:, 1] / np.where(ok, z, 1) + cy
    x0, y0, x1, y1 = crop
    near = ok & (u > x0 - margin) & (u < x1 + margin) & (v > y0 - margin) & (v < y1 + margin) & (m["o"] > 1 / 255)
    idx = np.nonzero(near)[0]
    Rq = quat_R(m["q"][idx])
    S = np.exp(m["ls"][idx])
    M = Rq * S[:, None, :]                              # R diag(s)
    cov3 = M @ M.transpose(0, 2, 1)
    covc = Rw[None] @ cov3 @ Rw.T[None]
    zc, xc, yc = z[idx], Xc[idx, 0], Xc[idx, 1]
    J = np.zeros((len(idx), 2, 3))
    J[:, 0, 0] = f / zc; J[:, 0, 2] = -f * xc / zc ** 2
    J[:, 1, 1] = f / zc; J[:, 1, 2] = -f * yc / zc ** 2
    cov2 = J @ covc @ J.transpose(0, 2, 1)
    d = m["X"][idx] - C
    dist = np.linalg.norm(d, axis=1)
    col = sh_color(m["dc"][idx], m["sh"][idx], d / dist[:, None])
    ev = np.linalg.eigvalsh(cov2)
    return {"packed": bool(m.get("packed")), "idx": idx, "u": u[idx], "v": v[idx], "z": zc, "dist": dist, "cov2": cov2, "sig": np.sqrt(np.maximum(ev, 0)),
            "o": m["o"][idx], "col": col, "iscl": (Rq / S[:, None, :]).transpose(0, 2, 1),   # S^-1 R^T
            "X": m["X"][idx], "C": C, "Rc2w": Rc2w, "f": f, "cx": cx, "cy": cy}


def raster(p, crop, mode="spirula3dgut", blur=0.3, preblur=0.0, compensate=True, cutoff2=8.0, min_alpha=0.5 / 255,
           u8=True, order=None, proj=None, color_clamp=True, collect=False):
    x0, y0, x1, y1 = crop
    Wc, Hc = x1 - x0, y1 - y0
    px, py = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    rays = np.stack([(px - p["cx"]) / p["f"], (py - p["cy"]) / p["f"], np.ones_like(px)], -1) @ p["Rc2w"].T
    n = len(p["o"])
    stats = {"w": [], "sig": [], "o": [], "comp": []} if collect else None
    if mode == "spirula3dgut":
        order = np.argsort(p["z"]) if order is None else order
        img = np.zeros((Hc, Wc, 3)); T = np.ones((Hc, Wc)); done = np.zeros((Hc, Wc), bool)
        col = np.maximum(p["col"], 0.0)
        for i in order:
            s = p["sig"][i, 1]
            r = 3.33 * math.sqrt(p["cov2"][i, 0, 0] + 0.3) + 1, 3.33 * math.sqrt(p["cov2"][i, 1, 1] + 0.3) + 1
            a0, a1 = int(max(x0, p["u"][i] - r[0])), int(min(x1, p["u"][i] + r[0] + 1))
            b0, b1 = int(max(y0, p["v"][i] - r[1])), int(min(y1, p["v"][i] + r[1] + 1))
            if a0 >= a1 or b0 >= b1:
                continue
            sl = (slice(b0 - y0, b1 - y0), slice(a0 - x0, a1 - x0))
            rd = rays[sl]
            g_o = p["iscl"][i] @ (p["C"] - p["X"][i])
            g_d = rd @ p["iscl"][i].T
            cr = np.cross(g_d, g_o[None, None, :])
            al = p["o"][i] * np.exp(-0.5 * (cr ** 2).sum(-1) / (g_d ** 2).sum(-1))
            live = (al > 1 / 255) & ~done[sl]
            if not live.any():
                continue
            Tt = T[sl]
            nT = Tt * (1 - al)
            acc = live & (nT > 1e-4)
            w = np.where(acc, al * Tt, 0.0)
            img[sl] += w[..., None] * col[i]
            T[sl] = np.where(acc, nT, Tt)
            done[sl] |= live & ~(nT > 1e-4)
            if collect and w.sum() > 0:
                stats["w"].append(w.sum()); stats["sig"].append(p["sig"][i]); stats["o"].append(p["o"][i]); stats["comp"].append(1.0)
        out = img
    else:
        cov = p["cov2"] + preblur * np.eye(2)[None]
        det0 = np.linalg.det(cov)
        cov = cov + blur * np.eye(2)[None]
        det = np.linalg.det(cov)
        comp = np.sqrt(np.maximum(det0 / det, 0)) if compensate else np.ones(n)
        a = p["o"] * comp
        inv = np.linalg.inv(cov)
        order = np.argsort(-p["dist"]) if order is None else order          # back to front, radial
        img = np.zeros((Hc, Wc, 3))
        col = p["col"] if not p.get("packed") else np.round(np.clip(p["col"], 0, 1) * 255) / 255
        for i in order:
            if a[i] < min_alpha:
                continue
            ev = np.linalg.eigvalsh(cov[i])
            rr = math.sqrt(cutoff2 * ev[1]) + 1
            a0, a1 = int(max(x0, p["u"][i] - rr)), int(min(x1, p["u"][i] + rr + 1))
            b0, b1 = int(max(y0, p["v"][i] - rr)), int(min(y1, p["v"][i] + rr + 1))
            if a0 >= a1 or b0 >= b1:
                continue
            sl = (slice(b0 - y0, b1 - y0), slice(a0 - x0, a1 - x0))
            dx = px[sl] - p["u"][i]; dy = py[sl] - p["v"][i]
            z2 = inv[i, 0, 0] * dx * dx + 2 * inv[i, 0, 1] * dx * dy + inv[i, 1, 1] * dy * dy
            al = a[i] * np.exp(-0.5 * z2)
            al = np.where((z2 <= cutoff2) & (al >= min_alpha), al, 0.0)
            if not al.any():
                continue
            src = al[..., None] * col[i]
            blended = src + (1 - al[..., None]) * img[sl]
            img[sl] = np.round(np.clip(blended, 0, 1) * 255) / 255 if u8 else blended
            if collect:
                stats["w"].append(al.sum()); stats["sig"].append(p["sig"][i]); stats["o"].append(p["o"][i]); stats["comp"].append(comp[i])
        out = img
    rgb = np.clip(out, 0, 1)
    return (np.round(rgb * 255).astype(np.uint8)[..., ::-1], stats)


def wpct(x, w, qs):
    o = np.argsort(x); x, w = x[o], w[o]
    c = np.cumsum(w) / w.sum()
    return [float(np.interp(q / 100, c, x)) for q in qs]


def texture_period(gray):
    """Characteristic scale of the band-passed (sigma 0.7..4 px) source texture: radially averaged power spectrum
    peak wavelength and the half-width of the autocorrelation main lobe, in pixels of that view."""
    import cv2
    g = cv2.GaussianBlur(gray, (0, 0), 0.7) - cv2.GaussianBlur(gray, (0, 0), 4.0)
    g = (g - g.mean()) * np.outer(np.hanning(g.shape[0]), np.hanning(g.shape[1]))
    F = np.abs(np.fft.fftshift(np.fft.fft2(g))) ** 2
    h, w = F.shape
    yy, xx = np.indices(F.shape)
    fr = np.hypot((yy - h // 2) / h, (xx - w // 2) / w)
    bins = np.linspace(0.02, 0.5, 49)
    prof = [F[(fr >= bins[k]) & (fr < bins[k + 1])].mean() for k in range(48)]
    k = int(np.argmax(np.array(prof) * (0.5 * (bins[:-1] + bins[1:])) ** 2))   # peak of f^2 P(f): where the texture energy sits
    fpk = 0.5 * (bins[k] + bins[k + 1])
    ac = np.fft.ifftshift(np.real(np.fft.ifft2(np.abs(np.fft.fft2(g)) ** 2)))
    ac /= ac.max()
    row = ac[h // 2, w // 2:]; colm = ac[h // 2:, w // 2]
    hw = [float(np.argmax(r < 0.5)) for r in (row, colm)]
    return {"energyPeakWavelengthPx": round(1 / fpk, 2), "autocorrHalfWidthPx_xy": hw}


def main(dd, out_json):
    import cv2
    dd = Path(dd)
    views = {v["name"]: v for v in json.load(open(dd / "refs" / "views.json"))["views"]}
    imap = json.load(open(dd / "spirula" / "index_map.json"))
    CROPS = {"carpet_a0_indep_f640": (660, 440, 788, 536), "carpet_a0_indep_f1280": (680, 520, 936, 712),
             "carpet_a0_fixed_f640": (460, 500, 588, 596), "carpet_a0_fixed_f1280": (280, 500, 536, 692)}
    res = {"doc": __doc__, "crops": {}}
    MQ = {}
    for model, ply in (("golden", dd / "golden_export.ply"), ("edge", dd / "edge_export.ply")):
        m = load_model(ply)
        MQ[model] = spark_packed(m)
        for vn, crop in CROPS.items():
            x0, y0, x1, y1 = crop
            v = views[vn]
            p = prepare(m, v, crop)
            key = f"{model}/{vn}"
            rec = {"crop": crop, "candidateSplats": int(len(p["o"]))}
            real_A = cv2.imread(str(dd / "spirula" / f"{model}_A" / f"eval-render-{imap[model + '_A'][vn]:05d}.png"))[y0:y1, x0:x1]
            real_C = cv2.imread(str(dd / "out_spark" / f"{model}_C__{vn}.png"))[y0:y1, x0:x1]
            ref = cv2.imread(str(dd / "refs" / f"ref_{vn}.png"))[y0:y1, x0:x1]
            psnr = lambda a, b: float(10 * np.log10(255 ** 2 / max(((a.astype(float) - b.astype(float)) ** 2).mean(), 1e-9)))
            sim_A, stA = raster(p, crop, "spirula3dgut", collect=True)
            mq = MQ[model]
            pq = prepare(mq, v, crop)
            sim_C, stC = raster(pq, crop, "spark", collect=True)
            sim_C_ext, _ = raster(p, crop, "spark")
            rec["validation"] = {"cpuSpirula_vs_realSpirulaA_psnr": psnr(sim_A, real_A),
                                 "cpuSpark_vs_realSparkC_psnr": psnr(sim_C, real_C),
                                 "cpuSparkExtAccumulator_vs_realSparkC_psnr": psnr(sim_C_ext, real_C),
                                 "realA_vs_realC_psnr": psnr(real_A, real_C)}
            variants = {
                "spark_blur0": dict(blur=0.0),
                "spark_preblur0.3_noComp": dict(blur=0.0, preblur=0.3),
                "spark_noCompOnly": dict(compensate=False),
                "spark_cutoff3.33": dict(cutoff2=3.33 ** 2),
                "spark_floatTarget": dict(u8=False),
                "spark_blur0_cutoff3.33_float": dict(blur=0.0, cutoff2=3.33 ** 2, u8=False),
            }
            gs = lambda im: 0.2126 * im[..., 2].astype(float) + 0.7152 * im[..., 1] + 0.0722 * im[..., 0]
            G = gs(ref)
            fb = lambda g: g - cv2.GaussianBlur(g, (0, 0), 1.5)
            def band(im):
                r, s = fb(gs(im))[6:-6, 6:-6], fb(G)[6:-6, 6:-6]
                r0, s0 = r - r.mean(), s - s.mean()
                return {"fineEnergyRatio": float(r0.std() / s0.std()), "fineNcc": float((r0 * s0).mean() / (r0.std() * s0.std())),
                        "fineCoherentGain": float((r0 * s0).mean() / (s0 ** 2).mean()), "meanLumaMinusRef": float(gs(im).mean() - G.mean())}
            rec["bands"] = {"realSpirulaA": band(real_A), "realSparkC": band(real_C), "cpuSpirula": band(sim_A),
                            "cpuSpark(packed accumulator = product)": band(sim_C), "cpuSpark_extAccumulator": band(sim_C_ext)}
            for nm, kw in variants.items():
                im, _ = raster(p, crop, "spark", **kw)        # variants on the ext (float) accumulator
                rec["bands"]["cpu_" + nm] = band(im)
                cv2.imwrite(str(dd / "cpu" / f"{model}_{vn}_{nm}.png"), im) if (dd / "cpu").is_dir() else None
            # footprints of the splats that actually contribute (weights = accumulated alpha*T per splat over the crop)
            for lab, st in (("spirula3dgut", stA), ("spark", stC)):
                w = np.array(st["w"]); sg = np.array(st["sig"]); o = np.array(st["o"]); cp = np.array(st["comp"])
                rec[f"footprint_{lab}"] = {
                    "contributingSplats": int(len(w)),
                    "sigmaMinorPx_w_p10_50_90": wpct(sg[:, 0], w, (10, 50, 90)),
                    "sigmaMajorPx_w_p10_50_90": wpct(sg[:, 1], w, (10, 50, 90)),
                    "opacity_w_p10_50_90": wpct(o, w, (10, 50, 90)),
                    "weightFrac_sigmaMinor_lt_0.5px": float(w[sg[:, 0] < 0.5].sum() / w.sum()),
                    "weightFrac_sigmaMajor_lt_1px": float(w[sg[:, 1] < 1.0].sum() / w.sum()),
                    "sparkCompensation_w_p10_50_90": wpct(cp, w, (10, 50, 90)) if lab == "spark" else None,
                    "meanAccumulatedAlphaPerPixel": float(w.sum() / ((x1 - x0) * (y1 - y0)))}
            rec["sourceTexture"] = texture_period(G)
            res["crops"][key] = rec
            (dd / "cpu").mkdir(exist_ok=True)
            cv2.imwrite(str(dd / "cpu" / f"{model}_{vn}_cpuSpirula.png"), sim_A)
            cv2.imwrite(str(dd / "cpu" / f"{model}_{vn}_cpuSpark.png"), sim_C)
            print(key, json.dumps(rec["validation"]), flush=True)
    json.dump(res, open(out_json, "w"), indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:3])
