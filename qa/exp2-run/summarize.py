import json
from pathlib import Path

from PIL import Image
import numpy as np

root = Path(__file__).resolve().parent
for label, p in [("A", root / "A" / "scalar-logs.json"), ("B", root / "B" / "scalar-logs.json")]:
    sc = json.loads(p.read_text())
    print(f"==== {label} tags ({len(sc)}) ====")
    for k in sorted(sc):
        if any(s in k.lower() for s in ("loss", "gauss", "psnr", "ssim", "memory", "gpu", "vram")):
            series = sc[k]
            if not series:
                continue
            first, last = series[0], series[-1]
            print(
                f"  {k}: n={len(series)} first_step={first.get('step')} "
                f"first={first.get('value')} last_step={last.get('step')} last={last.get('value')}"
            )

names = ("A_on_path.png", "B_off_path.png", "C_dollhouse.png", "D_overhead.png")
dest = root / "comparison"
dest.mkdir(exist_ok=True)


def find_png(arm: str, name: str):
    hits = list((root / arm).rglob(name))
    return hits[0] if hits else None


for name in names:
    left, right = find_png("A", name), find_png("B", name)
    print("png", name, left, right)
    if not (left and right):
        continue
    arr_l = np.asarray(Image.open(left).convert("RGB"))
    arr_r = np.asarray(Image.open(right).convert("RGB"))
    h = min(arr_l.shape[0], arr_r.shape[0])
    w = min(arr_l.shape[1], arr_r.shape[1])
    arr_l, arr_r = arr_l[:h, :w], arr_r[:h, :w]
    gap = np.zeros((h, 8, 3), dtype=np.uint8)
    side = np.concatenate([arr_l, gap, arr_r], axis=1)
    Image.fromarray(side).save(dest / name)
    print("wrote", dest / name, side.shape)
print("done")
