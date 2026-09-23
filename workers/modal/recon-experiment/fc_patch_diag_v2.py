"""Room 213 FINAL PRE-CORRECTION DIAGNOSTIC (read-only, no training). Runs with the fullcircle env python.

A. Renderer sanity: isolated high-opacity Gaussians (1/3/10/30 mm) at 2.5 m on a pixel ray, traced through the real
   3DGRT renderer; measured FWHM vs the angular size expected from the solved camera.
B. 12 fixed patches (3 ceiling-grid, 3 chair, 3 window-frame, 3 table/door), chosen from COLMAP points by geometry and
   point colour BEFORE any Gaussian statistic is read. Each point must be matched in >= 4 distinct physical exposures,
   which also guarantees repeatable structure rather than sensor noise.
C. Per patch: decoded source | actual training tensor (dataset loader, identical path to training) | exact-camera 30k
   native render on the training rays | independent cross-view localisation + leave-one-out residuals through the solved
   cameras | feature width | contributing Gaussians (analytic rank, CONFIRMED by ablation re-render) | footprint,
   opacity, densification-gradient accumulator (15k checkpoint, 1:1 with 30k because no Gaussian was added or removed
   after step 15000) | loader / mask / renderer checks.
"""
from __future__ import annotations

import json
import math
import sys
import traceback
from pathlib import Path

sys.path.insert(0, "/workspace/fullcircle")
import cv2  # noqa: E402
import numpy as np  # noqa: E402
import pycolmap  # noqa: E402
import torch  # noqa: E402

FC = "/vol/room213/2026-09-21/fullcircle"
DATA = f"{FC}/data/room213"
OUT = Path(f"{FC}/patch_diag_v2"); OUT.mkdir(exist_ok=True)
M_PER_UNIT = 1.1106                      # from the independently measured 32.26 mm inter-lens baseline (never constrained)
CLONE_THR = 2e-4
PATCH = 96                               # patch side in native px
PROF = 41                                # profile length in px
LOG: list[str] = []


def log(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); LOG.append(s)


runs = sorted(Path(f"{FC}/runs/room213_native").iterdir())
RUN = [r for r in runs if (r / "ours_30000").exists()][-1]
CK30 = RUN / "ours_30000" / "ckpt_30000.pt"
CK15 = RUN / "ours_15000" / "ckpt_15000.pt"
log("run", RUN)

from threedgrut.render import Renderer  # noqa: E402
from threedgrut.datasets.dataset_colmap import ColmapDataset  # noqa: E402
from threedgrut.utils.render import RGB2SH  # noqa: E402

R = Renderer.from_checkpoint(checkpoint_path=str(CK30), path=DATA, out_dir=str(OUT / "_r"), save_gt=False,
                             computes_extra_metrics=True)
model = R.model
N = int(model.num_gaussians)
log("gaussians", N)
ds = ColmapDataset(path=DATA, device="cuda", split="train", downsample_factor=1, test_frame_suffix="_test",
                   use_border_mask=True, border_mask_path=f"{FC}/mask_border.png")
paths = [str(p).replace("\\", "/") for p in ds.image_paths]


def ds_index(name: str) -> int | None:
    for i, p in enumerate(paths):
        if p.endswith("/" + name):
            return i
    return None


def gpu_batch(idx: int):
    dl = torch.utils.data.DataLoader(torch.utils.data.Subset(ds, [idx]), batch_size=1, num_workers=0)
    return ds.get_gpu_batch_with_intrinsics(next(iter(dl)))


def trace_patch(gb, x0, y0, w, h):
    ro = gb.rays_ori[:, y0:y0 + h, x0:x0 + w, :].contiguous()
    rd = gb.rays_dir[:, y0:y0 + h, x0:x0 + w, :].contiguous()
    with torch.no_grad():
        o = model.trace(ro, rd, gb.T_to_world)
    return o, o["pred_rgb"][0].clamp(0, 1).detach().cpu().numpy()


rec = pycolmap.Reconstruction(f"{DATA}/sparse/0")
img_by_name = {im.name: im for im in rec.images.values()}


def cam_of(im):
    return rec.camera(im.camera_id)


def c2w(im):
    cw = im.cam_from_world() if callable(im.cam_from_world) else im.cam_from_world
    Rm = np.asarray(cw.rotation.matrix()); t = np.asarray(cw.translation)
    return Rm, t


def obs_xy(im, p2):
    return np.asarray(im.point2D(p2).xy) if hasattr(im, "point2D") else np.asarray(im.points2D[p2].xy)


def project(im, X):
    """World points (N,3) -> pixels (N,2), valid mask (in front, < ~80 deg so the OPENCV_FISHEYE model is valid)."""
    Rm, t = c2w(im); Xc = X @ Rm.T + t
    ok = Xc[:, 2] > 0.17 * np.linalg.norm(Xc, axis=1)
    uv = np.full((len(X), 2), np.nan)
    if ok.any():
        uv[ok] = np.asarray(cam_of(im).img_from_cam(Xc[ok]))
    return uv, ok, Xc


def ray_world(im, uv):
    Rm, t = c2w(im); n = np.asarray(cam_of(im).cam_from_img(np.atleast_2d(uv)))
    d = np.column_stack([n, np.ones(len(n))]); d /= np.linalg.norm(d, axis=1, keepdims=True)
    return -Rm.T @ t, d @ Rm


def exposure_of(name: str) -> int:
    return int(Path(name).stem.replace("_test", "").split("_")[-1])


# ---------------------------------------------------------------- consistency checks: dataset poses vs COLMAP, pixel convention
REF = "camera2/frame_00103.png"
ri = ds_index(REF); gbr = gpu_batch(ri); imr = img_by_name[REF]
T = gbr.T_to_world[0].detach().cpu().numpy()
Rm, t = c2w(imr)
pose_diff = float(np.abs(T[:3, :3] - Rm.T).max()) + float(np.abs(T[:3, 3] - (-Rm.T @ t)).max())
d_c = gbr.rays_dir[0, 1920, 1300].detach().cpu().numpy()
uv_back = np.asarray(cam_of(imr).img_from_cam(d_c[None]))[0]
pix_offset = (uv_back - np.array([1300.0, 1920.0])).tolist()
log("pose diff dataset vs colmap", pose_diff, "| pixel->ray->colmap offset", pix_offset)
CHECKS = {"dataset_pose_vs_colmap_maxdiff": pose_diff, "ray_pixel_convention_offset_px": pix_offset}
off = np.array(pix_offset)              # colmap pixel = dataset pixel index + off

# ---------------------------------------------------------------- A. renderer sanity: isolated Gaussians
state = {k: getattr(model, k).detach().clone() for k in ("positions", "rotation", "scale", "density",
                                                        "features_albedo", "features_specular")}


def set_gaussians(pos, scl, dens, rgb):
    n = len(pos); dev = state["positions"].device; dt = state["positions"].dtype
    model.positions = torch.nn.Parameter(torch.tensor(pos, dtype=dt, device=dev))
    model.rotation = torch.nn.Parameter(torch.tensor([[1.0, 0, 0, 0]] * n, dtype=dt, device=dev))
    model.scale = torch.nn.Parameter(model.scale_activation_inv(torch.tensor(scl, dtype=dt, device=dev)))
    model.density = torch.nn.Parameter(model.density_activation_inv(torch.tensor(dens, dtype=dt, device=dev).reshape(n, 1)))
    model.features_albedo = torch.nn.Parameter(RGB2SH(torch.tensor(rgb, dtype=dt, device=dev)))
    model.features_specular = torch.nn.Parameter(torch.zeros((n, state["features_specular"].shape[1]), dtype=dt, device=dev))
    model.build_acc()


def restore():
    for k, v in state.items():
        setattr(model, k, torch.nn.Parameter(v.clone()))
    model.build_acc()


def fwhm_1d(p):
    p = np.asarray(p, float); p = p - p.min(); m = p.max()
    if m <= 0:
        return None
    half = m / 2; i = int(np.argmax(p)); l, r = i, i
    while l > 0 and p[l] > half: l -= 1
    while r < len(p) - 1 and p[r] > half: r += 1
    lx = l + (half - p[l]) / (p[l + 1] - p[l]) if p[l + 1] != p[l] else l
    rx = r - 1 + (p[r - 1] - half) / (p[r - 1] - p[r]) if p[r - 1] != p[r] else r
    return float(rx - lx)


renderer_test = []
try:
    cy, cx = 1920, 1300
    Tw = gbr.T_to_world[0].detach().cpu().numpy()
    dcam = gbr.rays_dir[0, cy, cx].detach().cpu().numpy(); dcam /= np.linalg.norm(dcam)
    o_w = Tw[:3, 3]; d_w = Tw[:3, :3] @ dcam
    D = 2.5 / M_PER_UNIT
    # local pixels-per-radian at this ray: rotate the ray by a tiny angle and measure the pixel displacement
    perp = np.cross(dcam, [0.0, 1.0, 0.0]); perp /= np.linalg.norm(perp); ang = 1e-4
    d2 = dcam * math.cos(ang) + perp * math.sin(ang)
    f_local = float(np.linalg.norm(np.asarray(cam_of(imr).img_from_cam(d2[None]))[0] -
                                   np.asarray(cam_of(imr).img_from_cam(dcam[None]))[0]) / ang)
    for mm in (1, 3, 10, 30):
        s = (mm / 1000.0) / M_PER_UNIT
        set_gaussians([o_w + D * d_w], [[s, s, s]], [0.99], [[1.0, 1.0, 1.0]])
        _, im = trace_patch(gbr, cx - 20, cy - 20, 41, 41)
        g = im.mean(axis=2)
        fx_ = fwhm_1d(g[20, :]); fy_ = fwhm_1d(g[:, 20])
        sigma_px = (mm / 1000.0) / 2.5 * f_local
        renderer_test.append({"size_mm": mm, "distance_m": 2.5, "expected_sigma_px": round(sigma_px, 3),
                              "expected_fwhm_px_if_gaussian": round(2.355 * sigma_px, 3),
                              "rendered_fwhm_x_px": None if fx_ is None else round(fx_, 3),
                              "rendered_fwhm_y_px": None if fy_ is None else round(fy_, 3),
                              "peak": round(float(g.max()), 3)})
        cv2.imwrite(str(OUT / f"renderer_single_{mm}mm.png"), cv2.resize((np.clip(im, 0, 1)[:, :, ::-1] * 255).astype(np.uint8), (205, 205), interpolation=cv2.INTER_NEAREST))
    log("renderer test", renderer_test)
except Exception as e:  # noqa: BLE001
    renderer_test.append({"error": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()[-800:]})
finally:
    restore()
assert int(model.num_gaussians) == N

# ---------------------------------------------------------------- B. patch selection (geometry + colour only)
pts = []
for pid, p in rec.points3D.items():
    ex = {}
    for el in p.track.elements:
        nm = rec.image(el.image_id).name
        ex.setdefault(exposure_of(nm), []).append((nm, el.point2D_idx))
    if len(ex) >= 4 and p.error < 1.5:
        pts.append((pid, np.asarray(p.xyz), np.asarray(p.color, float), ex))
P = np.array([x[1] for x in pts]); C = np.array([x[2] for x in pts]); lum = C @ np.array([0.299, 0.587, 0.114])
downs = []
for im in rec.images.values():
    Rm, _ = c2w(im); downs.append(Rm.T @ np.array([0.0, 1.0, 0.0]))
up = -np.mean(downs, axis=0); up /= np.linalg.norm(up)
h = P @ up
if lum[h > np.percentile(h, 95)].mean() < lum[h < np.percentile(h, 5)].mean():
    up, h = -up, -h                                   # ceiling = side with the bright light panels
floor, ceil = np.percentile(h, 2), np.percentile(h, 98)
hm = (h - floor) * M_PER_UNIT
e1 = np.cross(up, [1.0, 0, 0]); e1 = e1 if np.linalg.norm(e1) > 0.1 else np.cross(up, [0, 0, 1.0])
e1 /= np.linalg.norm(e1); e2 = np.cross(up, e1)
xy = np.column_stack([P @ e1, P @ e2]) * M_PER_UNIT
lo, hi = np.percentile(xy, 2, axis=0), np.percentile(xy, 98, axis=0)
wall = np.minimum.reduce([xy[:, 0] - lo[0], hi[0] - xy[:, 0], xy[:, 1] - lo[1], hi[1] - xy[:, 1]])
room = {"height_m": float((ceil - floor) * M_PER_UNIT), "footprint_m": (hi - lo).tolist()}
log("room", room)
Rr, G, Bb = C[:, 0], C[:, 1], C[:, 2]
red = (Rr > 150) & (G < 100) & (Bb < 100)                 # flag stripes: moving cloth, not static structure
floor_ = hm < 0.15                                         # carpet: repetitive texture, not structure
fam_mask = {
    "ceiling_grid": (hm > room["height_m"] - 0.30) & (wall > 0.3),
    "chair": (hm > 0.35) & (hm < 1.10) & (wall > 0.5) & (lum < 110),
    "window_frame": (wall < 0.45) & (hm > 0.9) & (hm < 2.5),
    "table_door": (((hm > 0.62) & (hm < 0.88) & (wall > 0.5)) |
                   ((wall < 0.45) & (hm > 0.3) & (hm < 2.1) & (Rr > 110) & (G > 0.4 * Rr) & (G < 0.8 * Rr) & (Bb < 0.6 * Rr))),
}
for _k in fam_mask:
    fam_mask[_k] &= ~red & ~floor_


def reference_obs(k, prefer_lens):
    best = None
    for exp_, obs in pts[k][3].items():
        for nm, p2 in obs:
            if nm.endswith("_test.png") or ds_index(nm) is None:
                continue
            uv = obs_xy(img_by_name[nm], p2)
            r = float(np.hypot(*(uv - 1920)))
            if r > 1500:
                continue
            score = r + (0 if nm.startswith(prefer_lens) else 400)
            if best is None or score < best[0]:
                best = (score, nm, uv)
    return best


# ---------------------------------------------------------------- C. per-patch analysis
ck15 = torch.load(str(CK15), map_location="cpu", weights_only=False)
grad = None
for key, val in ck15.items():
    if "densify_grad_norm_accum" in str(key):
        acc = val[0] if isinstance(val, (tuple, list)) else val
        den = ck15.get(str(key).replace("accum", "denom"))
        den = den[0] if isinstance(den, (tuple, list)) else den
        if acc is not None and den is not None and acc.shape[0] == N:
            grad = (acc / den.clamp(min=1)).squeeze().float().numpy()
n15 = int(ck15["positions"].shape[0]) if "positions" in ck15 else None
log("15k gaussians", n15, "grad buffer", None if grad is None else (float(np.median(grad)), float(grad.max())))
pos = state["positions"].cpu().numpy()
scl = model.scale_activation(state["scale"]).detach().cpu().numpy()
opa = model.density_activation(state["density"]).detach().cpu().numpy().ravel()
q = state["rotation"].cpu().numpy(); q = q / np.linalg.norm(q, axis=1, keepdims=True)


def rotmat(qq):
    w, x, y, z = qq.T
    return np.stack([np.stack([1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)], -1),
                     np.stack([2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)], -1),
                     np.stack([2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)], -1)], 1)


def gray(a):
    return cv2.cvtColor((np.clip(a, 0, 1) * 255).astype(np.uint8) if a.dtype != np.uint8 else a, cv2.COLOR_RGB2GRAY).astype(np.float32)


def orientation(g):
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, 3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, 3)
    c = slice(PATCH // 2 - 12, PATCH // 2 + 12)
    Jxx, Jyy, Jxy = (gx[c, c] ** 2).sum(), (gy[c, c] ** 2).sum(), (gx[c, c] * gy[c, c]).sum()
    th = 0.5 * math.atan2(2 * Jxy, Jxx - Jyy)
    coh = math.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (Jxx + Jyy + 1e-9)
    return np.array([math.cos(th), math.sin(th)]), coh


def profile(g, n):
    c = np.array([PATCH / 2 - 0.5, PATCH / 2 - 0.5]); tdir = np.array([-n[1], n[0]])
    s = np.arange(PROF) - PROF // 2; a = np.arange(-5, 6)
    X = c[0] + s[:, None] * n[0] + a[None, :] * tdir[0]; Y = c[1] + s[:, None] * n[1] + a[None, :] * tdir[1]
    v = cv2.remap(g, X.astype(np.float32), Y.astype(np.float32), cv2.INTER_LINEAR)
    return v.mean(axis=1)


def _cross(v, level, i0, step):
    i = i0
    while 0 <= i + step < len(v):
        a, b = v[i], v[i + step]
        if (a - level) * (b - level) <= 0 and a != b:
            return i + step * (level - a) / (b - a)
        i += step
    return None


def classify(p):
    ends = (p[:6].mean(), p[-6:].mean()); mid = p[PROF // 2 - 4:PROF // 2 + 5]
    base = 0.5 * (ends[0] + ends[1]); step = abs(ends[1] - ends[0])
    peak = mid.max() - base; dip = base - mid.min()
    if max(peak, dip) > 1.2 * step:
        return "dark_line" if dip >= peak else "bright_line"
    return "edge"


def feature_metrics(p, ftype=None):
    """Width/contrast measured with the SOURCE's feature type so source, training target and render are comparable."""
    p = np.asarray(p, float); ftype = ftype or classify(p)
    ends = (p[:6].mean(), p[-6:].mean()); base = 0.5 * (ends[0] + ends[1])
    if ftype in ("dark_line", "bright_line"):
        v = (base - p) if ftype == "dark_line" else (p - base)
        c = PROF // 2; i = int(np.argmax(v[c - 6:c + 7])) + c - 6; pk = v[i]
        if pk <= 0:
            return {"type": ftype, "contrast": 0.0, "width_px": None}
        l_ = _cross(v, pk / 2, i, -1); r_ = _cross(v, pk / 2, i, +1)
        return {"type": ftype, "contrast": float(pk), "width_px": (float(r_ - l_) if l_ is not None and r_ is not None else None)}
    lo_, hi_ = min(ends), max(ends); rng_ = hi_ - lo_
    if rng_ <= 0:
        return {"type": "edge", "contrast": 0.0, "width_px": None}
    pn = (p - lo_) / rng_
    if ends[0] > ends[1]:
        pn = 1 - pn
    c = PROF // 2
    x10 = _cross(pn, 0.1, c, -1) if pn[c] >= 0.1 else _cross(pn, 0.1, c, +1)
    x90 = _cross(pn, 0.9, c, +1) if pn[c] <= 0.9 else _cross(pn, 0.9, c, -1)
    w = (float(abs(x90 - x10)) if x10 is not None and x90 is not None else None)
    return {"type": "edge", "contrast": float(rng_), "width_px": w}


def n_lines(p, ftype):
    """Number of distinct thin lines/gaps in the profile (merged gaps show up as fewer lines in the render)."""
    p = np.asarray(p, float); base = np.median(p); v = (base - p) if ftype != "bright_line" else (p - base)
    rng = v.max() - v.min()
    if rng <= 0:
        return 0
    cnt, i = 0, 1
    while i < len(v) - 1:
        if v[i] > v[i - 1] and v[i] >= v[i + 1] and v[i] - min(v[max(0, i - 4):i + 5]) > 0.25 * rng and v[i] > 0.2 * rng:
            cnt += 1; i += 3
        else:
            i += 1
    return cnt


def noise_sigma(g):
    """Noise from flat pixels only: std of a high-pass where local gradient is in the lowest 30 %."""
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, 3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, 3); gm = np.hypot(gx, gy)
    hp = g - cv2.GaussianBlur(g, (0, 0), 1.0)
    flat = gm <= np.percentile(gm, 30)
    return float(hp[flat].std()) if flat.sum() > 50 else float(hp.std())


def localize(tpl, img, uv_seed, rad=16):
    x0, y0 = int(round(uv_seed[0])) - rad - tpl.shape[1] // 2, int(round(uv_seed[1])) - rad - tpl.shape[0] // 2
    W = img[max(0, y0):y0 + 2 * rad + tpl.shape[0], max(0, x0):x0 + 2 * rad + tpl.shape[1]]
    if W.shape[0] < tpl.shape[0] + 8 or W.shape[1] < tpl.shape[1] + 8:
        return None
    best = None; hh = tpl.shape[0]
    big = cv2.copyMakeBorder(tpl, hh // 2, hh // 2, hh // 2, hh // 2, cv2.BORDER_REFLECT)
    for rot in range(-30, 31, 10):
        for scf in (0.85, 1.0, 1.15):
            M = cv2.getRotationMatrix2D((big.shape[1] / 2, big.shape[0] / 2), rot, scf)
            Tt = cv2.warpAffine(big, M, (big.shape[1], big.shape[0]))[hh // 2:hh // 2 + hh, hh // 2:hh // 2 + hh]
            res = cv2.matchTemplate(W, Tt, cv2.TM_CCOEFF_NORMED)
            yy, xx = np.unravel_index(np.argmax(res), res.shape); pk = float(res[yy, xx])
            if best is None or pk > best[0]:
                best = (pk, xx, yy, res, Tt)
    pk, xx, yy, res, Tt = best
    r2 = res.copy(); r2[max(0, yy - 5):yy + 6, max(0, xx - 5):xx + 6] = -1
    if pk < 0.5 or pk - float(r2.max()) < 0.08:
        return None
    warp = np.array([[1, 0, xx], [0, 1, yy]], np.float32)
    try:
        _, warp = cv2.findTransformECC(Tt, W, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 60, 1e-4), None, 5)
    except cv2.error:
        return None
    m = warp @ np.array([Tt.shape[1] / 2 - 0.5, Tt.shape[0] / 2 - 0.5, 1.0])
    return np.array([m[0] + max(0, x0), m[1] + max(0, y0)]), pk


def triangulate(obs):
    A = np.zeros((3, 3)); b = np.zeros(3)
    for nm, uv in obs:
        o, d = ray_world(img_by_name[nm], uv); d = d[0]
        Mx = np.eye(3) - np.outer(d, d); A += Mx; b += Mx @ o
    return np.linalg.lstsq(A, b, rcond=None)[0]


def ray_response(o, d, idx):
    """Approximate per-Gaussian peak response along a ray (degree-2 form, used only to RANK; ablation is the truth)."""
    Rg = rotmat(q[idx]); S = scl[idx]
    Pinv = np.einsum("nij,nj,nkj->nik", Rg, 1.0 / (S ** 2 + 1e-12), Rg)
    dm = pos[idx] - o
    a = np.einsum("i,nij,j->n", d, Pinv, d); bq = np.einsum("i,nij,nj->n", d, Pinv, dm)
    tt = bq / np.maximum(a, 1e-12); r = dm - tt[:, None] * d[None, :]
    m2 = np.einsum("ni,nij,nj->n", r, Pinv, r)
    return np.exp(-0.5 * m2), tt


# ---------------------------------------------------------------- B2. outcome-blind selection: THIN structural lines
# Uses ONLY the decoded source image + COLMAP geometry. No render, no Gaussian statistic is read here.
img_cache: dict = {}


def src_gray(name):
    if name not in img_cache:
        if len(img_cache) > 24:
            img_cache.pop(next(iter(img_cache)))
        img_cache[name] = cv2.imread(f"{DATA}/images/{name}", cv2.IMREAD_GRAYSCALE).astype(np.float32)
    return img_cache[name]


def source_structure(name, uv_c):
    g = src_gray(name); uv_d = uv_c - off
    x0, y0 = int(round(uv_d[0])) - PATCH // 2, int(round(uv_d[1])) - PATCH // 2
    crop = g[y0:y0 + PATCH, x0:x0 + PATCH]
    if crop.shape != (PATCH, PATCH):
        return None
    n, coh = orientation(crop); prof = profile(crop, n); ft = classify(prof); fm = feature_metrics(prof, ft)
    return {"type": ft, "coh": coh, "width": fm["width_px"], "contrast": fm["contrast"],
            "nlines": n_lines(prof, ft), "mean": float(crop.mean()), "noise": noise_sigma(crop)}


FAMILY_TEST = {
    "ceiling_grid": lambda st: st["type"] == "dark_line" and st["coh"] >= 0.45,
    "chair": lambda st: st["type"] in ("dark_line", "bright_line") and st["nlines"] >= 2 and st["coh"] >= 0.35,
    "window_frame": lambda st: st["type"] in ("dark_line", "edge") and st["mean"] >= 150 and st["coh"] >= 0.5,
    "table_door": lambda st: st["coh"] >= 0.5,
}
chosen = []
selection_notes = {}
for fam, fm in fam_mask.items():
    cand = np.where(fm)[0]
    cand = cand[np.argsort(-np.array([len(pts[k][3]) for k in cand]))][:500] if len(cand) else cand
    ok = []
    for maxw in (8.0, 12.0):                       # thin first; relax only if a family cannot supply 3
        ok = []
        for k in cand:
            for lens in ("camera1", "camera2"):
                ref = reference_obs(k, lens)
                if ref is None or not ref[1].startswith(lens):
                    continue
                st = source_structure(ref[1], ref[2])
                if st is None or st["width"] is None:
                    continue
                snr_ = st["contrast"] / max(st["noise"], 1e-3)
                if 2.0 <= st["width"] <= maxw and snr_ >= 5 and FAMILY_TEST[fam](st):
                    ok.append((k, ref, st, snr_)); break
            if len(ok) >= 60:
                break
        if len(ok) >= 3:
            break
    selection_notes[fam] = {"candidates_prefiltered": int(len(cand)), "qualifying": len(ok), "max_width_px": maxw}
    picks = []
    for want in range(3):
        lens = ("camera1", "camera2")[(len(chosen) + want) % 2]
        taken = [pp[0] for pp in picks]
        pool = [o for o in ok if o[1][1].startswith(lens) and o[0] not in taken] or [o for o in ok if o[0] not in taken]
        if not pool:
            break
        if not picks:
            o = pool[0]
        else:
            dmin = [min(np.linalg.norm(xy[o[0]] - xy[pp[0]]) for pp in picks) for o in pool]
            o = pool[int(np.argmax(dmin))]
        picks.append(o)
    for (k, ref, st, snr_) in picks:
        chosen.append({"family": fam, "k": int(k), "point3D_id": int(pts[k][0]), "ref_image": ref[1],
                       "ref_uv_colmap": ref[2].tolist(), "height_m": round(float(hm[k]), 2),
                       "wall_dist_m": round(float(wall[k]), 2), "room_xy_m": [round(float(v), 2) for v in xy[k]],
                       "point_rgb": C[k].tolist(), "n_exposures": len(pts[k][3]),
                       "selection": {"type": st["type"], "width_px": round(st["width"], 2), "snr": round(snr_, 1),
                                     "nlines": st["nlines"], "coherence": round(st["coh"], 3)}})
log("selection", selection_notes)
log("chosen", [(c["family"], c["ref_image"], c["selection"]) for c in chosen])
KFAC = None
try:
    rr_ = [r_["rendered_fwhm_x_px"] / r_["expected_fwhm_px_if_gaussian"] for r_ in renderer_test if r_.get("size_mm") in (3, 10)]
    KFAC = float(np.mean(rr_)) if rr_ else None
except Exception:  # noqa: BLE001
    KFAC = None
log("renderer kernel footprint factor vs Gaussian FWHM", KFAC)

results = []
rows_img = []
for pi, ch in enumerate(chosen):
    rep = {**ch}
    try:
        name = ch["ref_image"]; imc = img_by_name[name]; idx = ds_index(name)
        uv_c = np.array(ch["ref_uv_colmap"]); uv_d = uv_c - off                      # dataset pixel index coords
        x0, y0 = int(round(uv_d[0])) - PATCH // 2, int(round(uv_d[1])) - PATCH // 2
        src = cv2.cvtColor(cv2.imread(f"{DATA}/images/{name}"), cv2.COLOR_BGR2RGB)
        s_crop = src[y0:y0 + PATCH, x0:x0 + PATCH]
        gb = gpu_batch(idx)
        rgb_gt = gb.rgb_gt[0].detach().cpu().numpy(); msk = gb.mask[0, :, :, 0].detach().cpu().numpy() if gb.mask is not None else None
        t_crop = rgb_gt[y0:y0 + PATCH, x0:x0 + PATCH]
        loader_diff = float(np.abs(t_crop * 255.0 - s_crop.astype(np.float32)).max())
        masked_frac = float(msk[y0:y0 + PATCH, x0:x0 + PATCH].mean()) if msk is not None else 0.0   # 1 = capturer = excluded
        _, r_crop = trace_patch(gb, x0, y0, PATCH, PATCH)
        gs, gt_, gr = gray(s_crop), gray(t_crop), gray(r_crop)
        n, coh = orientation(gs)
        ps, pt_, pr = profile(gs, n), profile(gt_, n), profile(gr, n)
        fs = feature_metrics(ps); ftype = fs["type"]
        ft, fr = feature_metrics(pt_, ftype), feature_metrics(pr, ftype)
        nl_s, nl_r = n_lines(ps, ftype), n_lines(pr, ftype)
        nz = noise_sigma(gs)
        rep.update({"loader_max_abs_diff_0_255": round(loader_diff, 3), "capturer_masked_frac": round(masked_frac, 3),
                    "edge_coherence": round(coh, 3), "noise_sigma": round(nz, 2),
                    "source": fs, "training_target": ft, "render": fr,
                    "snr": round(fs["contrast"] / max(nz, 1e-3), 1), "lines_source": nl_s, "lines_render": nl_r,
                    "contrast_ratio_render_over_source": round(fr["contrast"] / max(fs["contrast"], 1e-6), 3),
                    "broadening_render_over_source": (round(fr["width_px"] / fs["width_px"], 3)
                                                      if fs.get("width_px") and fr.get("width_px") else None)})
        # ---- cross-view: independent localisation in distinct physical exposures + leave-one-out through solved cameras
        tpl = cv2.cvtColor(s_crop[PATCH // 2 - 20:PATCH // 2 + 21, PATCH // 2 - 20:PATCH // 2 + 21], cv2.COLOR_RGB2GRAY)
        X0 = np.asarray(rec.point3D(ch["point3D_id"]).xyz)
        meas = [(name, uv_c)]; tried = 0; views = []
        for exp_, obs in pts[ch["k"]][3].items():
            if exp_ == exposure_of(name):
                continue
            nm = sorted(obs, key=lambda o: 0 if o[0].split("/")[0] == name.split("/")[0] else 1)[0][0]
            im2 = img_by_name[nm]; uvp, ok, _ = project(im2, X0[None])
            if not ok[0] or np.hypot(*(uvp[0] - 1920)) > 1800:
                continue
            tried += 1
            g2 = cv2.imread(f"{DATA}/images/{nm}", cv2.IMREAD_GRAYSCALE)
            got = localize(tpl, g2, uvp[0] - off)
            if got is not None:
                meas.append((nm, got[0] + off)); views.append({"image": nm, "ncc": round(got[1], 3)})
            if len(meas) >= 6:
                break
        resid = []
        if len(meas) >= 3:
            for i in range(len(meas)):
                others = [m for j, m in enumerate(meas) if j != i]
                Xl = triangulate(others)
                uvp, ok, _ = project(img_by_name[meas[i][0]], Xl[None])
                if ok[0]:
                    resid.append(float(np.linalg.norm(uvp[0] - meas[i][1])))
        w = fs.get("width_px") or float("nan")
        rep["cross_view"] = {"exposures_tried": tried, "exposures_measured": len(meas),
                             "loo_residual_px": [round(r, 3) for r in resid],
                             "median_residual_px": round(float(np.median(resid)), 3) if resid else None,
                             "max_residual_px": round(float(np.max(resid)), 3) if resid else None,
                             "median_residual_over_width": round(float(np.median(resid)) / w, 3) if resid and w == w else None,
                             "views": views}
        # ---- contributors: analytic rank on the profile rays, then confirmation by ablation re-render
        Rm, t = c2w(imc); Xc = pos @ Rm.T + t
        front = Xc[:, 2] > 0.17 * np.linalg.norm(Xc, axis=1)
        cand = np.where(front)[0]
        uvg = np.asarray(cam_of(imc).img_from_cam(Xc[cand]))
        near = np.hypot(*(uvg - uv_c).T) < 120
        cand = cand[near]
        o_w = -Rm.T @ t
        prof_uv = uv_c[None, :] + (np.arange(PROF) - PROF // 2)[:, None] * n[None, :]
        _, dirs = ray_world(imc, prof_uv)
        W = np.zeros((len(cand), PROF))
        for j in range(PROF):
            resp, tt = ray_response(o_w, dirs[j], cand)
            alpha = np.clip(opa[cand] * resp, 0, 0.99); alpha[tt <= 0] = 0
            order = np.argsort(tt); Tr = 1.0; wv = np.zeros(len(cand))
            for kk in order:
                wv[kk] = Tr * alpha[kk]; Tr *= (1 - alpha[kk])
                if Tr < 1e-3:
                    break
            W[:, j] = wv
        wmax = W.max(axis=1); vis = cand[wmax > 0.02]; rank = cand[np.argsort(-wmax)]
        # projected footprint along the feature normal via a numerical Jacobian of the fisheye projection
        def footprint(ii):
            Xi = Xc[ii]; eps = 1e-4 * np.linalg.norm(Xi)
            J = np.zeros((2, 3))
            for a_ in range(3):
                dp = np.zeros(3); dp[a_] = eps
                J[:, a_] = (np.asarray(cam_of(imc).img_from_cam((Xi + dp)[None]))[0] -
                            np.asarray(cam_of(imc).img_from_cam((Xi - dp)[None]))[0]) / (2 * eps)
            Rg = rotmat(q[ii:ii + 1])[0]; Sw = Rg @ np.diag(scl[ii] ** 2) @ Rg.T
            Sc = Rm @ Sw @ Rm.T; S2 = J @ Sc @ J.T
            return float(math.sqrt(max(n @ S2 @ n, 0))), float(math.sqrt(max(np.linalg.eigvalsh(S2).max(), 0)))
        top = rank[:12]
        contribs = []
        for ii in top:
            sn, smax = footprint(ii)
            contribs.append({"id": int(ii), "max_weight": round(float(wmax[list(cand).index(ii)]), 3),
                             "opacity": round(float(opa[ii]), 3), "sigma_along_normal_px": round(sn, 2),
                             "fwhm_along_normal_px": round(2.355 * sn, 2), "sigma_major_px": round(smax, 2),
                             "scale_mm": [round(float(v) * M_PER_UNIT * 1000, 1) for v in scl[ii]],
                             "grad15k_over_thr": (round(float(grad[ii]) / CLONE_THR, 3) if grad is not None else None)})
        # ablation: remove top-5 / top-20 / all visible contributors, re-render the patch, measure profile contrast kept
        abl = {}
        for tag, ids in (("top5", rank[:5]), ("top20", rank[:20]), ("all_visible", vis)):
            if len(ids) == 0:
                continue
            dd = state["density"].clone(); dd[torch.as_tensor(ids, device=dd.device)] = -30.0
            model.density = torch.nn.Parameter(dd); model.build_acc()
            _, ra = trace_patch(gb, x0, y0, PATCH, PATCH)
            pa = profile(gray(ra), n)
            abl[tag] = {"n_removed": int(len(ids)), "profile_change_mean_abs": round(float(np.abs(pa - pr).mean()), 2),
                        "render_contrast_left": round(float(feature_metrics(pa)["contrast"]), 2)}
            model.density = torch.nn.Parameter(state["density"].clone()); model.build_acc()
        fw = [c["fwhm_along_normal_px"] * (KFAC or 1.0) for c in contribs if c["max_weight"] > 0.02]
        rep["contributors"] = {"n_candidates": int(len(cand)), "n_visible_weight_gt_0.02": int(len(vis)),
                               "median_rendered_fwhm_along_normal_px_visible": round(float(np.median(fw)), 2) if fw else None, "kernel_factor_applied": KFAC,
                               "min_rendered_fwhm_along_normal_px_visible": round(float(np.min(fw)), 2) if fw else None,
                               "top": contribs, "ablation": abl,
                               "split_history": "not recorded by the released trainer; grad15k_over_thr is the "
                                                "densification accumulator (<1 = never qualified to clone/split)"}
        # ---- PASS criteria (thresholds fixed in the brief)
        sw = fs.get("width_px"); cv = rep["cross_view"]
        a_ok = rep["snr"] >= 5 and sw is not None and sw >= 1.5 and loader_diff <= 1.0 and masked_frac < 0.05
        xv_n = cv["exposures_measured"]; xv_med = cv["median_residual_px"]
        b_ok = xv_n >= 3 and xv_med is not None and xv_med <= 1.0
        b_pref = cv["median_residual_over_width"] is not None and cv["median_residual_over_width"] < 0.25
        br = rep["broadening_render_over_source"]; crt = rep["contrast_ratio_render_over_source"]
        merged = nl_r < nl_s
        c_ok = (br is not None and br >= 1.3) or crt <= 0.6 or merged
        d_ok = bool(fw) and sw is not None and float(np.median(fw)) >= sw
        e_ok = loader_diff <= 1.0 and masked_frac < 0.05
        src_limited = xv_n >= 3 and xv_med is not None and sw is not None and xv_med >= 0.75 * sw
        rep["criteria"] = {"a_resolved_in_training_target": a_ok, "b_cross_view_le_1px": b_ok, "b_pref_lt_25pct_width": b_pref,
                           "c_repeatable_model_deficit": c_ok, "c_detail": {"broadening": br, "contrast_ratio": crt, "merged_lines": merged},
                           "d_contributors_coarser_than_feature": d_ok, "e_no_loader_mask_defect": e_ok,
                           "source_camera_limited": src_limited}
        if src_limited:
            rep["verdict"] = "SOURCE/CAMERA-LIMITED"
        elif xv_n < 3 or xv_med is None:
            rep["verdict"] = "INCONCLUSIVE-CROSSVIEW"
        elif a_ok and b_ok and c_ok and d_ok and e_ok:
            rep["verdict"] = "PASS"
        else:
            miss = [n_ for n_, v_ in (("a", a_ok), ("b", b_ok), ("c", c_ok), ("d", d_ok), ("e", e_ok)) if not v_]
            rep["verdict"] = "FAIL(" + ",".join(miss) + ")"
        log(pi, ch["family"], name, rep["verdict"], "src_w", sw, "ren_w", fr.get("width_px"), "crat", crt, "lines", nl_s, nl_r, "xv", xv_n, xv_med)
        # ---- sheet row
        def tile(a, lab):
            a8 = (np.clip(a, 0, 1) * 255).astype(np.uint8) if a.dtype != np.uint8 else a
            tt_ = cv2.resize(cv2.cvtColor(a8, cv2.COLOR_RGB2BGR), (192, 192), interpolation=cv2.INTER_NEAREST)
            c0 = (96, 96); dv = n * 60
            cv2.line(tt_, (int(c0[0] - dv[0]), int(c0[1] - dv[1])), (int(c0[0] + dv[0]), int(c0[1] + dv[1])), (0, 255, 255), 1)
            cv2.putText(tt_, lab, (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 0), 1)
            return tt_
        plot = np.full((192, 260, 3), 20, np.uint8)
        allp = np.concatenate([ps, pr]); pmin, pmax = allp.min(), allp.max() + 1e-6
        for prof_, col in ((ps, (0, 255, 0)), (pr, (0, 128, 255))):
            ptsl = np.column_stack([np.linspace(8, 252, PROF), 180 - (prof_ - pmin) / (pmax - pmin) * 160]).astype(np.int32)
            cv2.polylines(plot, [ptsl], False, col, 2)
        cv2.putText(plot, "green=source orange=render", (6, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (220, 220, 220), 1)
        cv2.putText(plot, f"w src {sw} ren {fr.get('width_px')}", (6, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (220, 220, 220), 1)
        cv2.putText(plot, f"xview med {cv['median_residual_px']}px  {rep['verdict']}", (6, 46), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (220, 220, 220), 1)
        head = np.zeros((192, 170, 3), np.uint8)
        for li, txt in enumerate([f"#{pi+1} {ch['family']}", name.replace('.png', ''), f"h {ch['height_m']}m wall {ch['wall_dist_m']}m",
                                  f"exps {ch['n_exposures']} snr {rep['snr']}", f"GS vis {len(vis)} fwhm {rep['contributors']['median_rendered_fwhm_along_normal_px_visible']}"]):
            cv2.putText(head, txt, (4, 18 + 20 * li), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
        rows_img.append(np.hstack([head, tile(s_crop, "1 decoded source"), tile(t_crop, "2 training tensor"),
                                   tile(r_crop, "3 native 30k render"), plot]))
    except Exception as e:  # noqa: BLE001
        rep["error"] = f"{type(e).__name__}: {e}"; rep["trace"] = traceback.format_exc()[-1200:]; rep["verdict"] = "ERROR"
        log("patch", pi, "ERROR", rep["error"])
    results.append(rep)
    json.dump({"checks": CHECKS, "renderer_test": renderer_test, "room": room, "patches": results, "log": LOG[-60:]},
              open(OUT / "patch_diag.json", "w"), indent=1, default=str)

if rows_img:
    cv2.imwrite(str(OUT / "patch_sheet.png"), np.vstack(rows_img))
fams = {}
for r_ in results:
    fams.setdefault(r_["family"], []).append(r_["verdict"])
n_pass = sum(1 for r_ in results if r_["verdict"] == "PASS")
verd_counts = {}
for r_ in results:
    kk_ = r_["verdict"].split("(")[0]
    verd_counts[kk_] = verd_counts.get(kk_, 0) + 1
fam_pass = sum(1 for v in fams.values() if "PASS" in v)
summary = {"n_patches": len(results), "n_pass": n_pass, "families_with_pass": fam_pass,
           "by_family": fams, "overall_authorise_capacity_correction": n_pass >= 8 and fam_pass >= 3,
           "n_source_limited": sum(1 for r_ in results if r_["verdict"] == "SOURCE/CAMERA-LIMITED"), "verdict_counts": verd_counts,
           "selection_notes": selection_notes, "kernel_factor": KFAC}
log("SUMMARY", summary)
json.dump({"summary": summary, "checks": CHECKS, "renderer_test": renderer_test, "room": room, "patches": results,
           "log": LOG[-80:]}, open(OUT / "patch_diag.json", "w"), indent=1, default=str)
