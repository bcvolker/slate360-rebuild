"""Edge profile helpers copied verbatim from room213-forensic/analyze_edges.py (same 10-90% width definition)."""
import cv2, numpy as np

def gray(x): return cv2.cvtColor(np.ascontiguousarray(x, np.float32), cv2.COLOR_RGB2GRAY) * 255.0

def edge_points(g, m, n_max=250):
    gs = cv2.GaussianBlur(g, (0, 0), 1.0); gx, gy = cv2.Sobel(gs, cv2.CV_32F, 1, 0), cv2.Sobel(gs, cv2.CV_32F, 0, 1); mag = np.hypot(gx, gy)
    thr = np.percentile(mag[m], 92); pts = []
    ys, xs = np.where((mag > thr) & m)
    order = np.argsort(-mag[ys, xs])
    for i in order:
        y, x = ys[i], xs[i]; d = np.array([gx[y, x], gy[y, x]]) / (mag[y, x] + 1e-9)
        # non-maximum along the gradient + spacing
        a = mag[int(round(y + d[1])), int(round(x + d[0]))] if 1 <= y < g.shape[0] - 1 and 1 <= x < g.shape[1] - 1 else 0
        b = mag[int(round(y - d[1])), int(round(x - d[0]))] if 1 <= y < g.shape[0] - 1 and 1 <= x < g.shape[1] - 1 else 0
        if mag[y, x] < a or mag[y, x] < b: continue
        if any((y - p[0]) ** 2 + (x - p[1]) ** 2 < 16 for p in pts): continue
        pts.append((y, x, d))
        if len(pts) >= n_max: break
    return pts

SS = np.arange(-8, 8.001, 0.25)
def profile(g, y, x, d):
    px = (x + SS * d[0]).astype(np.float32).reshape(1, -1); py = (y + SS * d[1]).astype(np.float32).reshape(1, -1)
    return cv2.remap(g, px, py, cv2.INTER_LINEAR).ravel()


def pos_width(p):
    lo, hi = np.percentile(p[:12], 50), np.percentile(p[-12:], 50); c = hi - lo
    if abs(c) < 10: return None
    s = (p - lo) / c
    mid = np.where((s[:-1] - 0.5) * (s[1:] - 0.5) <= 0)[0]
    if len(mid) == 0: return None
    i = mid[np.argmin(np.abs(SS[mid]))]; x50 = SS[i] + (0.5 - s[i]) / (s[i + 1] - s[i] + 1e-9) * 0.25
    sm = np.maximum.accumulate(np.clip(s, 0, 1)); w = np.interp(0.9, sm, SS) - np.interp(0.1, sm, SS)
    return float(x50), float(w), float(abs(c))
