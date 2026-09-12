#!/bin/bash
# Fetches the FAISS-format vocab tree COLMAP 4.1's sequential/vocab-tree matchers need for
# loop closure. The legacy flann tree bundled with nerfstudio's data dir crashes COLMAP 4.1
# ("Failed to read faiss index" — verified 2026-09-12). Run once inside WSL.
set -euo pipefail
DEST_DIR="/home/rian_/slate360-engines/colmap-4.1.0"
DEST="$DEST_DIR/vocab_tree_faiss_flickr100K_words32K.bin"
URL="https://github.com/colmap/colmap/releases/download/3.11.1/vocab_tree_faiss_flickr100K_words32K.bin"

mkdir -p "$DEST_DIR"
if [ -s "$DEST" ]; then
  echo "already present: $DEST ($(stat -c%s "$DEST") bytes)"
  exit 0
fi
echo "fetching $URL"
curl -fL --retry 3 -o "$DEST.part" "$URL"
mv "$DEST.part" "$DEST"
echo "fetched: $DEST ($(stat -c%s "$DEST") bytes)"
