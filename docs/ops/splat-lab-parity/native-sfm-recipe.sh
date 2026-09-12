#!/bin/bash
# Native equirectangular SfM recipe verified on the 2026-09-10 kitchen (815 panoramas) with stock COLMAP 4.1.0.
# Part 1: masks + feature extraction. Part 2: exhaustive matching on panoramas + mapper + model_analyzer.
# Numbers from the proof run are in docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md §2.1.
# Proof run: native EQUIRECTANGULAR SfM on the 815 kitchen panoramas with stock COLMAP 4.1.0,
# people masks applied, sequential matching (overlap 4) + vocab-tree loop detection. Mirrors AirVis.
C=/home/rian_/slate360-engines/colmap-4.1.0/bin/colmap
SRC="/mnt/c/Users/Brian PC/Documents/AirVis/kitchen_AirVisStudio/Extracted"
T=/mnt/c/s360/tmp/splat-lab/native-sfm-test
VOCAB=/home/rian_/.local/share/nerfstudio/vocab_tree.fbow
mkdir -p "$T/masks" "$T/sparse"
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
  > "$T/features.log" 2>&1
t1=$(date +%s); echo "features: $((t1-t0)) s  (exit $?)"

C=/home/rian_/slate360-engines/colmap-4.1.0/bin/colmap
SRC="/mnt/c/Users/Brian PC/Documents/AirVis/kitchen_AirVisStudio/Extracted"
T=/mnt/c/s360/tmp/splat-lab/native-sfm-test
rm -rf "$T/sparse"; mkdir -p "$T/sparse"
t1=$(date +%s)
$C exhaustive_matcher --database_path "$T/database.db" --ExhaustiveMatching.block_size 100 \
  --FeatureMatching.use_gpu 1 --FeatureMatching.num_threads 16 > "$T/matching2.log" 2>&1
echo "matching(exhaustive 815): $((`date +%s`-t1)) s exit=$?"
t2=$(date +%s)
$C mapper --database_path "$T/database.db" --image_path "$SRC/sfm-panoramas-7680" --output_path "$T/sparse" \
  --Mapper.num_threads 16 > "$T/mapper2.log" 2>&1
echo "mapping: $((`date +%s`-t2)) s exit=$?"
for d in "$T"/sparse/*/; do
  echo "model $d"; $C model_analyzer --path "$d" 2>&1 | grep -E "Registered|Points|reprojection|Cameras|Observations|Frames" ;
done
echo "TOTAL2: $((`date +%s`-t1)) s"
