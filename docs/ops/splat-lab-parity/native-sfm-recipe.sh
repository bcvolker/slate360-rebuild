#!/bin/bash
# Native equirectangular SfM recipe, proven end-to-end on the 2026-09-10 kitchen (815
# panoramas) with stock COLMAP 4.1.0 already installed on this machine. This is the exact
# recipe workers/local/splat-lab/stages/sfm.py runs (see that file for the real
# pipeline code); this script is a standalone copy for manual reproduction/benchmarking.
# Final measured numbers are in docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md Sec 2.1:
# 815/815 registered, 420,993 points, 1.258px reprojection. Sequential+loop matching
# (197s) is 14.7x faster than exhaustive (2900s) on the same feature set - use it above
# ~200 images (below that, exhaustive's simplicity outweighs the small time cost).
set -u
C=/home/rian_/slate360-engines/colmap-4.1.0/bin/colmap
VOCAB=/home/rian_/slate360-engines/colmap-4.1.0/vocab_tree_faiss_flickr100K_words32K.bin
SRC="/mnt/c/Users/Brian PC/Documents/AirVis/kitchen_AirVisStudio/Extracted"
T=/mnt/c/s360/tmp/splat-lab/native-sfm-recipe-run
mkdir -p "$T/masks"

# COLMAP mask convention: <mask_path>/<image name incl. extension>.png, zero = ignore.
for m in "$SRC"/sfm-panorama-masks-7680/*.png; do
  b=$(basename "$m" .png); [ -e "$T/masks/$b.jpg.png" ] || ln -s "$m" "$T/masks/$b.jpg.png"
done
echo "masks linked: $(ls "$T/masks" | wc -l)"

rm -f "$T/database.db"
t0=$(date +%s)
$C feature_extractor --database_path "$T/database.db" --image_path "$SRC/sfm-panoramas-7680" \
  --ImageReader.camera_model EQUIRECTANGULAR --ImageReader.single_camera 1 \
  --ImageReader.mask_path "$T/masks" \
  --FeatureExtraction.use_gpu 1 --FeatureExtraction.max_image_size 4096 \
  --SiftExtraction.max_num_features 16384
echo "features: $(($(date +%s)-t0)) s"

t1=$(date +%s)
$C sequential_matcher --database_path "$T/database.db" \
  --SequentialMatching.overlap 4 --SequentialMatching.quadratic_overlap 0 \
  --SequentialMatching.loop_detection 1 --SequentialMatching.loop_detection_period 10 \
  --SequentialMatching.loop_detection_num_images 30 \
  --SequentialMatching.vocab_tree_path "$VOCAB" \
  --FeatureMatching.use_gpu 1
echo "matching: $(($(date +%s)-t1)) s"

t2=$(date +%s)
mkdir -p "$T/sparse"
$C mapper --database_path "$T/database.db" --image_path "$SRC/sfm-panoramas-7680" \
  --output_path "$T/sparse" --Mapper.num_threads 16
echo "mapping: $(($(date +%s)-t2)) s"
echo "TOTAL: $(($(date +%s)-t0)) s"

for d in "$T"/sparse/*/; do
  echo "model $d"
  $C model_analyzer --path "$d" 2>&1 | grep -E "Registered|Points|reprojection|Cameras"
done
