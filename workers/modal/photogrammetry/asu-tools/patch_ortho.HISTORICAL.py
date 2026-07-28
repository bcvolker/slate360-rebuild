"""Upgrade ortho(): single z-buffer winner -> median-of-top-N per cell +
DEM median filter + small-hole inpainting (external-review consensus)."""
s = open("worker.py", encoding="utf-8").read()

old = '''    cx = np.clip(((x - x0) / gsd_m).astype(np.int32), 0, W - 1)
    cy = np.clip(((y1 - y) / gsd_m).astype(np.int32), 0, H - 1)
    flat = cy.astype(np.int64) * W + cx
    # z-buffer: highest point wins per cell (top-down view)
    order = np.argsort(z)  # ascending; later (higher) overwrites
    dem = np.full(W * H, np.nan, np.float32)
    img = np.zeros((W * H, 3), np.uint8)
    dem[flat[order]] = z[order]
    img[flat[order]] = rgb[order]
    dem = dem.reshape(H, W); img = img.reshape(H, W, 3)

    import cv2'''

new = '''    cx = np.clip(((x - x0) / gsd_m).astype(np.int32), 0, W - 1)
    cy = np.clip(((y1 - y) / gsd_m).astype(np.int32), 0, H - 1)
    flat = cy.astype(np.int64) * W + cx

    # QUALITY PASS (review consensus): per cell take the median of the TOP-N
    # highest points (rejects outliers + noise; single-winner z-buffer was the
    # source of the sparse/dark render). Vectorized via lexsort groups.
    import cv2
    order = np.lexsort((-z, flat))          # group by cell, z descending
    fs, zs, rs = flat[order], z[order], rgb[order]
    grp_start = np.flatnonzero(np.r_[True, fs[1:] != fs[:-1]])
    grp_end = np.r_[grp_start[1:], fs.size]
    TOPN = 5
    dem = np.full(W * H, np.nan, np.float32)
    img = np.zeros((W * H, 3), np.uint8)
    # median index within the top-N slice of each group
    take = grp_start + np.minimum((grp_end - grp_start), TOPN) // 2
    cells = fs[grp_start]
    dem[cells] = zs[take]
    img[cells] = rs[take]
    dem = dem.reshape(H, W); img = img.reshape(H, W, 3)

    # DEM: median filter (outlier spikes) then fill holes from nearest valid
    hole = ~np.isfinite(dem)
    dem_f = cv2.medianBlur(np.nan_to_num(dem, nan=0).astype(np.float32), 5)
    dem = np.where(hole, np.nan, dem_f)
    if hole.any():
        _, labels = cv2.distanceTransformWithLabels(
            hole.astype(np.uint8), cv2.DIST_L2, 5,
            labelType=cv2.DIST_LABEL_PIXEL)
        valid_idx = np.flatnonzero(~hole.ravel())
        # map label -> nearest valid pixel value
        lab_of_valid = labels.ravel()[valid_idx]
        fill_lut = np.zeros(labels.max() + 1, np.float32)
        fill_lut[lab_of_valid] = dem.ravel()[valid_idx]
        dem_filled = fill_lut[labels.ravel()].reshape(H, W)
        dem = np.where(hole, dem_filled, dem)

    # RGB: inpaint small holes; leave giant no-coverage regions dark
    holes8 = hole.astype(np.uint8) * 255
    n_lbl, lbl, stats, _ = cv2.connectedComponentsWithStats(holes8)
    small = np.zeros_like(holes8)
    for i in range(1, n_lbl):
        if stats[i, cv2.CC_STAT_AREA] <= 5000:   # ~4.5 m^2 at 3cm
            small[lbl == i] = 255
    img = cv2.inpaint(img, small, 7, cv2.INPAINT_TELEA)'''

assert old in s, "anchor not found"
s = s.replace(old, new)
open("worker.py", "w", encoding="utf-8").write(s)
import py_compile; py_compile.compile("worker.py", doraise=True)
print("ortho() upgraded + compiles")
