#!/usr/bin/env bash
set -euo pipefail
export HOME=/home/rian_
export PYTHONIOENCODING=utf-8
NS=/home/rian_/slate360-engines/nerfstudio/.venv/bin/python
SRC=/mnt/c/s360/scripts/ops/x4-splatfacto-challenger
echo "=== unit tests ==="
"$NS" -m pytest -q "$SRC/test_x4_splatfacto_challenger.py"
echo "=== dataset ==="
"$NS" "$SRC/build_dataset.py"
echo "=== operator masks ==="
"$NS" "$SRC/operator_masks.py"
echo "=== train A baseline ==="
"$NS" "$SRC/run_train.py" --experiment A
echo "=== train B bilateral grid ==="
"$NS" "$SRC/run_train.py" --experiment B
echo "=== export A ==="
"$NS" "$SRC/export_ply.py" --experiment A
echo "=== export B ==="
"$NS" "$SRC/export_ply.py" --experiment B
echo "=== eval + GT|A|B ==="
"$NS" "$SRC/eval_holdout.py"
echo "=== report ==="
"$NS" "$SRC/write_report.py"
echo DONE
