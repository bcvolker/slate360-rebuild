r"""Digitize Brian's sharpie signature: paper background removed, ink
recolored, tight crop, transparent PNG at two colorways.

Input:  C:\ASU-Survey\signature.jpg  (phone photo, black sharpie on white)
Output: deliverables\signature_offwhite.png  (#F2F4F8 — for dark surfaces)
        deliverables\signature_ink.png       (near-black — for light/print)
Alpha comes from ink darkness (anti-aliased edges preserved), so it lays
over the insignia cleanly per the spec's signature-across-seal rule.
"""
import cv2
import numpy as np

SRC = r"C:\ASU-Survey\signature.jpg"
DELIV = r"C:\ASU-Survey\deliverables"

img = cv2.imread(SRC)
assert img is not None, "save the phone photo as C:\\ASU-Survey\\signature.jpg"
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)

# normalize paper illumination (large-kernel background estimate)
bg = cv2.GaussianBlur(gray, (0, 0), 25)
norm = np.clip(gray / np.maximum(bg, 1) * 255, 0, 255)

# ink-ness -> alpha (dark = opaque), soft ramp keeps stroke edges smooth
lo, hi = 120.0, 200.0
alpha = np.clip((hi - norm) / (hi - lo), 0, 1)
alpha = cv2.medianBlur((alpha * 255).astype(np.uint8), 3)

# tight crop with margin
ys, xs = np.where(alpha > 30)
pad = 24
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, alpha.shape[0])
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, alpha.shape[1])
a = alpha[y0:y1, x0:x1]

for name, rgb in [("signature_offwhite.png", (248, 244, 242)),
                  ("signature_ink.png", (18, 19, 23))]:
    out = np.zeros((a.shape[0], a.shape[1], 4), np.uint8)
    out[..., 0] = rgb[2]
    out[..., 1] = rgb[1]
    out[..., 2] = rgb[0]
    out[..., 3] = a
    cv2.imwrite(DELIV + "\\" + name, out)
    print("wrote", name, out.shape[:2])
print("coverage %.1f%% of crop" % ((a > 30).mean() * 100))
