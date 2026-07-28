r"""M5: recover the acutance lost to the single rotation-resample with a MILD
unsharp mask, calibrated so the warped master's sharpness matches the DD export
master -- compensating resampling softening, NOT fabricating detail. Guard
against halos by capping the amount and checking overshoot.
"""
import os

import cv2
import numpy as np
import tifffile

D = r"C:\ASU-Survey\deliverables"


def acut(bgr):
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return float(cv2.Laplacian(g, cv2.CV_32F).var())


placed = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
cx, cy, s = 4200, 3800, 400
b_crop = placed[cy:cy + s, cx:cx + s, :3]

M = np.load(os.path.join(D, "m1_lossless_affine.npy"))
Minv = cv2.invertAffineTransform(M)
fpts = np.float32([[cx, cy], [cx + s, cy], [cx, cy + s]])
spts = cv2.transform(fpts.reshape(-1, 1, 2), Minv).reshape(-1, 2)
ssz = int(np.hypot(spts[1][0] - spts[0][0], spts[1][1] - spts[0][1]))
arr = tifffile.TiffFile(os.path.join(D, "dd_ortho_lossless.tif")).pages[0].asarray()
a_crop = arr[int(spts[0][1]):int(spts[0][1]) + ssz,
             int(spts[0][0]):int(spts[0][0]) + ssz, :3][:, :, ::-1]
# upsample a to match b's pixel count so acutance is compared like-for-like
a_up = cv2.resize(a_crop, (s, s), interpolation=cv2.INTER_LANCZOS4)
target = acut(a_up)
print("target acutance (DD export, matched px): %.1f" % target)
print("warped (no sharpen): %.1f" % acut(b_crop))


def unsharp(img, amount, sigma=1.0):
    blur = cv2.GaussianBlur(img, (0, 0), sigma)
    return cv2.addWeighted(img, 1 + amount, blur, -amount, 0)


for amt in [0.0, 0.3, 0.5, 0.7, 1.0]:
    sh = unsharp(b_crop, amt)
    over = int((sh.astype(np.int16) - b_crop.astype(np.int16)).max())
    print("amount %.1f -> acutance %.1f  (max overshoot %d/255)" % (amt, acut(sh), over))
