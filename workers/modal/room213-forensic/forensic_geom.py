"""Exact Spirula v2026.9.24 split-face geometry (CameraMath.cpp:333-349, 400-404) + projections + plane sweep.
Shared by forensic_prep.py. See that file for the code-derivation references."""


FISH_AXES = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
             [[0, -1, 0], [0, 0, 1], [-1, 0, 0]], [[1, 0, 0], [0, 0, 1], [0, -1, 0]]]
EQUI_AXES = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
             [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], [[1, 0, 0], [0, 0, 1], [0, -1, 0]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]]]


def face_plan(cam):
    import math
    equi = "EQUIRECT" in str(cam.model)
    K = 6 if equi else 5
    S = math.ceil(math.sqrt(cam.width * cam.height / K)); half = (S + 1) // 2
    return (EQUI_AXES if equi else FISH_AXES), float(half), 2 * half, equi


def project(cam, d):
    """Source pixel (COLMAP continuous, pixel centre at +0.5) for camera-frame directions d (N,3). Fisheye uses the
    COLMAP THIN_PRISM_FISHEYE equations with theta=atan2(r,z), so rays past 90 deg project exactly like Spirula's."""
    import numpy as np
    if "EQUIRECT" in str(cam.model):
        return np.asarray(cam.img_from_cam(d)), np.ones(len(d), bool)
    fx, fy, cx, cy, k1, k2, p1, p2, k3, k4, sx1, sx2 = cam.params
    r = np.hypot(d[:, 0], d[:, 1]); th = np.arctan2(r, d[:, 2]); th2 = th * th
    thd = th * (1 + k1 * th2 + k2 * th2 ** 2 + k3 * th2 ** 3 + k4 * th2 ** 4)
    s = np.where(r > 1e-12, thd / np.maximum(r, 1e-12), 1.0)
    u, v = d[:, 0] * s, d[:, 1] * s
    u2, v2, uv = u * u, v * v, u * v; rr = u2 + v2
    du = 2 * p1 * uv + p2 * (rr + 2 * u2) + sx1 * rr
    dv = 2 * p2 * uv + p1 * (rr + 2 * v2) + sx2 * rr
    return np.stack([fx * (u + du) + cx, fy * (v + dv) + cy], 1), th < np.radians(100)


def face_of(cam, dcam):
    import numpy as np
    axes, f, side, _ = face_plan(cam)
    best = None
    for k, M in enumerate(axes):
        q = np.array(M) @ dcam
        if q[2] > 0 and abs(q[0] / q[2]) <= 1 and abs(q[1] / q[2]) <= 1 and (best is None or q[2] > best[1]):
            best = (k, q[2])
    return best[0] if best else None


def face_pixels(cam, img, k, u0, v0, w, h):
    """EXACT training pixels of face k over the window [u0,u0+w)x[v0,v0+h) (float, 0..1): one bilinear tap per pixel centre."""
    import numpy as np, cv2
    axes, f, side, _ = face_plan(cam); c = f
    uu, vv = np.meshgrid(np.arange(u0, u0 + w) + 0.5, np.arange(v0, v0 + h) + 0.5)
    df = np.stack([(uu - c) / f, (vv - c) / f, np.ones_like(uu)], -1).reshape(-1, 3)
    ds = df @ np.array(axes[k], float)                      # M^T d_face (rows of M are the face axes in the source frame)
    uv, ok = project(cam, ds)
    mx = uv[:, 0].reshape(h, w).astype(np.float32) - 0.5; my = uv[:, 1].reshape(h, w).astype(np.float32) - 0.5
    out = cv2.remap(img.astype(np.float32) / 255.0, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0.5, 0.5, 0.5))
    return out, mx, my


def plane_frame(n):
    import numpy as np
    n = n / np.linalg.norm(n); a = np.array([0, 0, 1.0]) if abs(n[2]) < 0.9 else np.array([1.0, 0, 0])
    u = np.cross(a, n); u /= np.linalg.norm(u); v = np.cross(n, u)
    return n, u, v


def to_face(im, cam, k, P):
    """World points -> face-k continuous pixel coords (pixel centre at +0.5)."""
    import numpy as np
    axes, f, side, _ = face_plan(cam)
    cw = im.cam_from_world(); Rs = np.asarray(cw.rotation.matrix()); ts = np.asarray(cw.translation)
    q = (np.array(axes[k], float) @ (P @ Rs.T + ts).T).T
    return np.stack([f * q[:, 0] / q[:, 2] + f, f * q[:, 1] / q[:, 2] + f], 1), q[:, 2]


def geom(im, cam, X, n, u, v):
    """Per-observation geometry at X: face, source/face pixel, native vs training px/mm, distance, incidence. None if unseen."""
    import numpy as np
    cw = im.cam_from_world(); Rs = np.asarray(cw.rotation.matrix()); ts = np.asarray(cw.translation)
    C = np.asarray(im.projection_center()); dist = float(np.linalg.norm(C - X))
    if (C - X) @ n <= 0: return None                      # behind the surface
    dcam = Rs @ X + ts; k = face_of(cam, dcam / np.linalg.norm(dcam))
    if k is None: return None
    fp, z = to_face(im, cam, k, np.array([X, X + 0.001 * u, X + 0.001 * v]))
    if z.min() <= 0: return None
    sp, _ = project(cam, np.array([dcam, Rs @ (X + 0.001 * u) + ts, Rs @ (X + 0.001 * v) + ts]))
    return dict(face=int(k), src_px=sp[0].tolist(), face_px=fp[0].tolist(),
                px_per_mm_train=float(np.mean([np.linalg.norm(fp[1] - fp[0]), np.linalg.norm(fp[2] - fp[0])])),
                px_per_mm_native=float(np.mean([np.linalg.norm(sp[1] - sp[0]), np.linalg.norm(sp[2] - sp[0])])),
                dist_m=dist, incidence_deg=float(np.degrees(np.arccos(min(1.0, abs(n @ (C - X)) / dist)))), C=C.tolist())


def ortho_from_source(im, cam, img, G, shape):
    """Direct (single bilinear) source sample of world points G -> texture; used only for the plane sweep."""
    import numpy as np, cv2
    cw = im.cam_from_world(); Rs = np.asarray(cw.rotation.matrix()); ts = np.asarray(cw.translation)
    uv, ok = project(cam, G @ Rs.T + ts)
    t = cv2.remap(img, uv[:, 0].reshape(shape).astype(np.float32) - 0.5, uv[:, 1].reshape(shape).astype(np.float32) - 0.5, cv2.INTER_LINEAR,
                  borderMode=cv2.BORDER_REFLECT)
    return t


def band(g, s0, s1):
    import cv2
    return cv2.GaussianBlur(g, (0, 0), s0) - cv2.GaussianBlur(g, (0, 0), s1)


def ncc(a, b):
    import numpy as np
    a = a - a.mean(); b = b - b.mean(); return float((a * b).mean() / (a.std() * b.std() + 1e-9))


def plane_sweep(sel, X, n, u, v, half_m, texel_m, deltas):
    """Offset along n maximising cross-view agreement: mean NCC of each view's mid band (1.5-4 texels) to the median
    texture. sel = [(im, cam, gray float image)]. Returns (best delta, curve)."""
    import numpy as np
    m = int(round(2 * half_m / texel_m)); a = (np.arange(m) - m / 2 + 0.5) * texel_m; A_, B_ = np.meshgrid(a, a)
    curve = []
    for d in deltas:
        G = (X + d * n) + A_.reshape(-1, 1) * u + B_.reshape(-1, 1) * v
        tex = [band(ortho_from_source(im, cam, g, G, (m, m)), 1.5, 4.0) for im, cam, g in sel]
        med = np.median(np.stack(tex), 0)
        curve.append(float(np.mean([ncc(t, med) for t in tex])))
    return float(deltas[int(np.argmax(curve))]), curve
