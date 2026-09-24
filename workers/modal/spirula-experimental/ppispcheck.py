"""Did PPISP actually engage in Experiment 1? Reads the learned per-image PPISP parameters from the accepted terminal
checkpoint (and the step-5000 durable checkpoint), proves the optimizer state is non-zero, quantifies the learned
exposure / colour corrections, and applies a learned correction to Spirula's raw render of a training camera.
The no_crf_no_vig transform is transcribed from the pinned generated kernel (src/generated/ppisp.cuh:1332)."""

from __future__ import annotations

import io
import json
import tarfile

import numpy as np

B_ = np.array([[0.04805419966578484, -0.0043631000444293], [-0.0043631000444293, 0.04812829941511154]])
R_ = np.array([[0.05805699899792671, -0.0179871991276741], [-0.0179871991276741, 0.04310610145330429]])
G_ = np.array([[0.04333360120654106, -0.01805369928479195], [-0.01805369928479195, 0.0580499991774559]])
N_ = np.array([[0.01283689960837364, -0.00346540007740259], [-0.00346540007740259, 0.01281579956412315]])


def ppisp_apply(rgb, p):
    """rgb [...,3] linear-ish display values in [0,1] (as the kernel sees them); p: 9 params."""
    rgb = rgb * (2.0 ** p[0])
    bd, rd, gd, nd = B_ @ p[1:3], R_ @ p[3:5], G_ @ p[5:7], N_ @ p[7:9]
    s124, s125 = 1 / 3 + nd[0], 1 / 3 + nd[1]
    T = np.array([[bd[0], 1 + rd[0], gd[0]], [bd[1], rd[1], 1 + gd[1]], [1.0, 1.0, 1.0]])
    M = np.array([[0.0, -1.0, s125], [1.0, 0.0, -s124], [-s125, s124, 0.0]]) @ T
    lam = np.cross(M[0], M[1])
    if lam @ lam < 1e-20:
        lam = np.cross(M[0], M[2])
        if lam @ lam < 1e-20:
            lam = np.cross(M[1], M[2])
    H = T @ np.diag(lam) @ np.array([[-1.0, -1.0, 1.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
    if abs(H[2, 2]) > 1e-20:
        H = H / H[2, 2]
    x, y = rgb[..., 0], rgb[..., 1]; inten = x + y + rgb[..., 2]
    o = np.stack([x, y, inten], -1) @ H.T
    nf = inten / np.maximum(o[..., 2], 1e-4 * np.abs(inten) + 1e-8)
    r, g = o[..., 0] * nf, o[..., 1] * nf
    return np.clip(np.stack([r, g, inten - r - g], -1), 0, 1)


def members(raw: bytes) -> dict:
    out = {}
    with tarfile.open(fileobj=io.BytesIO(raw)) as t:
        for m in t.getmembers():
            if m.isfile():
                b = t.extractfile(m).read()
                out[m.name] = json.loads(b) if m.name == "state.json" else (np.load(io.BytesIO(b)) if m.name.endswith(".npy") else b)
    return out


def check(final_state: bytes, ck5000_state: bytes, image_filenames: list, render_bgr, gt_bgr, twin_index: int,
          mask) -> dict:
    fin = members(final_state); c5 = members(ck5000_state)
    st = fin["state.json"]
    pk = [k for k in fin if "ppisp" in k.lower()]
    res = {"stateJsonPpisp": st.get("ppisp"), "ppispMembers": {k: list(np.shape(fin[k])) for k in pk}}
    for dct in (fin, c5):
        for k in list(dct):
            if "ppisp" in k.lower() and k.endswith(".npy") and np.ndim(dct[k]) == 1 and np.size(dct[k]) % 9 == 0:
                dct[k] = np.asarray(dct[k]).reshape(-1, 9)       # stored flat [n_images * 9]
    par_key = next((k for k in pk if k.endswith("params.npy")), None)
    if par_key is None:
        res["error"] = "no [n,9] PPISP parameter array found"; return res
    P = fin[par_key].astype(np.float64); P5 = c5[par_key].astype(np.float64) if par_key in c5 else None
    res["paramArray"] = par_key; res["nImages"] = int(P.shape[0]); res["nTrainImagesInDump"] = len(image_filenames)
    res["identityInit"] = "zeros (engine_init_ppisp: params.zero() for non-'original' layouts)"
    res["maxAbsParam"] = float(np.abs(P).max()); res["meanAbsParam"] = float(np.abs(P).mean())
    res["paramsChangedSinceStep5000"] = float(np.abs(P - P5).max()) if P5 is not None else None
    opt = {k: float(np.abs(fin[k]).max()) for k in pk if k.endswith(".npy") and k != par_key}
    res["optimizerStateMaxAbs"] = opt
    ex = P[:, 0]
    res["exposureStops"] = {"mean": round(float(ex.mean()), 4), "std": round(float(ex.std()), 4),
                            "p5": round(float(np.percentile(ex, 5)), 4), "p95": round(float(np.percentile(ex, 95)), 4),
                            "min": round(float(ex.min()), 4), "max": round(float(ex.max()), 4)}
    # colour effect on neutral grey and on typical room colours (after removing exposure)
    probes = np.array([[0.5, 0.5, 0.5], [0.8, 0.8, 0.8], [0.3, 0.35, 0.4], [0.6, 0.5, 0.4]])
    dev = []
    for p in P:
        q = p.copy(); q[0] = 0
        dev.append(float(np.abs(ppisp_apply(probes, q) - probes).max()))
    dev = np.array(dev) * 255
    res["colourCorrectionMaxChannelShift8bit"] = {"median": round(float(np.median(dev)), 2),
                                                  "p90": round(float(np.percentile(dev, 90)), 2), "max": round(float(dev.max()), 2)}
    tot = []
    for p in P:
        tot.append(float(np.abs(ppisp_apply(probes, p) - probes).mean()) * 255)
    res["totalCorrectionMeanAbs8bit"] = {"median": round(float(np.median(tot)), 2), "p90": round(float(np.percentile(tot, 90)), 2),
                                         "max": round(float(np.max(tot)), 2)}
    # apply the twin training image's learned correction to Spirula's raw render of that camera
    p = P[twin_index]
    r = render_bgr[..., ::-1].astype(np.float64) / 255; g = gt_bgr[..., ::-1].astype(np.float64) / 255
    rc = ppisp_apply(r, p)
    m = mask
    psnr = lambda a, b: float(10 * np.log10(1 / max(((a - b) ** 2)[m].mean(), 1e-12)))
    res["twinTrainingImage"] = image_filenames[twin_index]
    res["twinParams"] = [round(float(x), 4) for x in p]
    res["correctedVsRawMeanAbs8bit"] = round(float(np.abs(rc - r)[m].mean() * 255), 3)
    res["psnrRawVsSource"] = round(psnr(r, g), 3); res["psnrCorrectedVsSource"] = round(psnr(rc, g), 3)
    return res
