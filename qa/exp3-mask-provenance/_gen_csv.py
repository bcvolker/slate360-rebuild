import json
from pathlib import Path

SCRATCH = Path("/mnt/c/s360-recon-exp/qa/exp3-mask-provenance/_scratch")
OUT = Path("/mnt/c/s360-recon-exp/qa/exp3-mask-provenance/mask-diff.csv")

raw = json.load(open(SCRATCH / "raw_hashes.json"))
dec = json.load(open(SCRATCH / "decoded_hashes.json"))
agg = json.load(open(SCRATCH / "agg_hashes.json"))

local_raw, vol_raw, tar_raw = raw["local"], raw["volume"], raw["tar"]
local_dec, vol_dec, tar_dec = dec["local"], dec["volume"], dec["tar"]

names = sorted(set(local_raw) | set(vol_raw) | set(tar_raw))
rows = []
n_byte_diff_lv = n_byte_diff_lt = n_byte_diff_vt = 0
n_pixel_diff_lv = n_pixel_diff_lt = 0
n_missing_local = n_missing_vol = n_missing_tar = 0

for name in names:
    lr, vr, tr = local_raw.get(name), vol_raw.get(name), tar_raw.get(name)
    ld, vd, td = local_dec.get(name), vol_dec.get(name), tar_dec.get(name)
    if lr is None:
        n_missing_local += 1
    if vr is None:
        n_missing_vol += 1
    if tr is None:
        n_missing_tar += 1
    byte_same_lv = lr == vr
    byte_same_lt = lr == tr
    byte_same_vt = vr == tr
    pixel_same_lv = ld == vd
    pixel_same_lt = ld == td
    if not byte_same_lv:
        n_byte_diff_lv += 1
    if not byte_same_lt:
        n_byte_diff_lt += 1
    if not byte_same_vt:
        n_byte_diff_vt += 1
    if not pixel_same_lv:
        n_pixel_diff_lv += 1
    if not pixel_same_lt:
        n_pixel_diff_lt += 1
    rows.append({
        "filename": name,
        "local_sha256": lr, "volume_sha256": vr, "tar_sha256": tr,
        "raw_bytes_identical_local_volume": byte_same_lv,
        "raw_bytes_identical_local_tar": byte_same_lt,
        "raw_bytes_identical_volume_tar": byte_same_vt,
        "decoded_pixels_identical_local_volume": pixel_same_lv,
        "decoded_pixels_identical_local_tar": pixel_same_lt,
        # No file in this dataset differs, so bbox/region columns are
        # structurally present (per the task spec) but empty for every row.
        "changed_pixel_count": "", "changed_pixel_pct": "",
        "changed_bbox": "", "change_region_class": "",
    })

import csv
fieldnames = list(rows[0].keys())
with open(OUT, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(rows)

summary = {
    "file_count": {"local": len(local_raw), "volume": len(vol_raw), "tar": len(tar_raw)},
    "filename_set_equal": {
        "local_volume": set(local_raw) == set(vol_raw),
        "local_tar": set(local_raw) == set(tar_raw),
        "volume_tar": set(vol_raw) == set(tar_raw),
    },
    "missing": {"local": n_missing_local, "volume": n_missing_vol, "tar": n_missing_tar},
    "byte_identical_count": {
        "local_volume": len(names) - n_byte_diff_lv,
        "local_tar": len(names) - n_byte_diff_lt,
        "volume_tar": len(names) - n_byte_diff_vt,
    },
    "byte_different_count": {
        "local_volume": n_byte_diff_lv, "local_tar": n_byte_diff_lt, "volume_tar": n_byte_diff_vt,
    },
    "pixel_identical_despite_byte_diff": {
        "local_volume": sum(1 for r in rows if not r["raw_bytes_identical_local_volume"] and r["decoded_pixels_identical_local_volume"]),
        "local_tar": sum(1 for r in rows if not r["raw_bytes_identical_local_tar"] and r["decoded_pixels_identical_local_tar"]),
    },
    "pixel_different_count": {"local_volume": n_pixel_diff_lv, "local_tar": n_pixel_diff_lt},
    "aggregate_dir_hashes_sha256_dir": agg,
}
(Path(SCRATCH) / "summary.json").write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
