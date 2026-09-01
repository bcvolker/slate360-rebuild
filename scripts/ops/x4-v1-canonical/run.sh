#!/usr/bin/env bash
set -euo pipefail
SRC="/mnt/c/s360/scripts/ops/x4-v1-canonical"
RUN="/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/Runs/2026-08-31T22-x4-v1-canonical"
DOC="/mnt/c/s360/docs/ops/x4-v1-canonical"
IMAGES="/home/rian_/route_b_x4/images"
CVPY="/home/rian_/venvs/kitchen-apriltag/bin/python"
GSPY="/home/rian_/slate360-engines/odgs-fixed/.venv/bin/python"

mkdir -p "$RUN" "$DOC/screenshots"
echo "=== tests ==="
"$CVPY" -m pytest -q "$SRC/test_x4_v1_canonical.py"
echo "=== dataset (existing Route B COLMAP, 800px equatorial) ==="
"$CVPY" "$SRC/dataset.py" --out "$RUN/dataset"
echo "=== train 25000 persist attributes ==="
"$GSPY" "$SRC/train.py" --dataset "$RUN/dataset" --images "$IMAGES" --out "$RUN" --steps 25000
echo "=== eval holdout + named GT|render ==="
"$GSPY" "$SRC/eval.py" --ckpt "$RUN/checkpoint.pt" --dataset "$RUN/dataset" --images "$IMAGES" --ply "$RUN/x4_v1_canonical_raw.ply" --out "$RUN"
echo "=== EXACT_FRAME_SIM3 on center + orientation + uniform scale ==="
"$CVPY" "$SRC/apply_sim3.py" --raw "$RUN/x4_v1_canonical_raw.ply" --out "$RUN/x4_v1_canonical_arkit.ply"
echo "=== SPZ no aggressive filter (Windows npx; WSL1 cannot launch node) ==="
WIN_ARKIT=$(wslpath -w "$RUN/x4_v1_canonical_arkit.ply")
WIN_SPZ=$(wslpath -w "$RUN/x4_v1_canonical.spz")
powershell.exe -NoProfile -Command "npx -y @playcanvas/splat-transform -w '$WIN_ARKIT' --filter-nan '$WIN_SPZ' --spz-version 3"
python3 - <<PY
import json
from pathlib import Path
spz = Path("$RUN/x4_v1_canonical.spz")
meta = {"raw": "$RUN/x4_v1_canonical_arkit.ply", "spz": str(spz), "n_in": 53944, "aggressive_strip": False, "ok": spz.is_file(), "spz_bytes": spz.stat().st_size if spz.is_file() else 0}
(spz.parent / "x4_v1_canonical.spz.json").write_text(json.dumps(meta, indent=2) + "\n")
print(json.dumps(meta, indent=2))
PY
echo "=== copy report artifacts (not training weights) ==="
cp -f "$RUN/V1_CANONICAL_METRICS.json" "$RUN/TRAIN_CONFIG.json" "$RUN/OPTIMIZER_META.json" "$RUN/PLY_HEADER.txt" "$RUN/x4_v1_canonical.spz.json" "$DOC/"
cp -f "$RUN/dataset/DATASET.json" "$DOC/"
cp -f "$RUN/screenshots/"fridge_side.jpg "$RUN/screenshots/"island_side.jpg "$RUN/screenshots/"archway_side.jpg \
  "$RUN/screenshots/"dark_cabinetry_side.jpg "$RUN/screenshots/"living_opening_side.jpg "$DOC/screenshots/"
echo "DONE $RUN"
