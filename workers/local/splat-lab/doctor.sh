#!/bin/bash
# Splat Lab dependency checks, run from lib/splat-lab/doctor.ts. Written as a real
# script file (not an inline `wsl -lc '...multi-line...'` string) because a
# multi-line string passed as a single argv element through Node's Windows
# process spawning to wsl.exe does not survive intact (verified 2026-09-12:
# an inline multi-line script silently truncated mid-line).
set -u
py="$1"
colmap="$2"
vocab="$3"

if command -v ffmpeg >/dev/null 2>&1; then echo "FFMPEG=yes"; else echo "FFMPEG=no"; fi
echo "COLMAP=$("$colmap" --version 2>&1 | head -1 || echo missing)"

# `colmap ... --help` prints a DIFFERENT, shorter summary depending on whether
# stdout is a TTY (verified 2026-09-12: identical invocation, only the output
# destination differed, and the short form omits per-camera-model docs) — so
# grepping --help for EQUIRECTANGULAR is unreliable. Instead run a real
# feature_extractor smoke test on a throwaway 1px image; COLMAP only
# validates the camera-model name once it actually processes an image
# (image_reader.cc's ExistsCameraModelWithName check).
eqtest_dir="/tmp/splat-lab-doctor-eqtest"
mkdir -p "$eqtest_dir/images"
if [ ! -s "$eqtest_dir/images/probe.jpg" ]; then
  "$py" -c "from PIL import Image; Image.new('RGB', (8, 4), (0, 0, 0)).save('$eqtest_dir/images/probe.jpg')" 2>/dev/null
fi
rm -f "$eqtest_dir/db.db"
if "$colmap" feature_extractor --database_path "$eqtest_dir/db.db" --image_path "$eqtest_dir/images" \
    --ImageReader.camera_model EQUIRECTANGULAR --ImageReader.single_camera 1 \
    >/tmp/splat-lab-doctor-eqtest.log 2>&1; then
  echo "COLMAP_EQUIRECT=yes"
else
  echo "COLMAP_EQUIRECT=no"
fi
if [ -s "$vocab" ]; then echo "VOCAB_TREE=yes"; else echo "VOCAB_TREE=no"; fi

"$py" -c "
mods = ['py360convert', 'numpy', 'PIL', 'onnxruntime', 'gsplat', 'nerfstudio', 'tensorboard']
missing = []
for m in mods:
    try:
        __import__(m)
    except Exception:
        missing.append(m)
print('PY_DEPS=' + ('ok' if not missing else 'missing:' + ','.join(missing)))
try:
    import torch
    print('CUDA=' + ('yes' if torch.cuda.is_available() else 'no'))
except Exception as e:
    print('CUDA=error:' + str(e)[:80])
"
