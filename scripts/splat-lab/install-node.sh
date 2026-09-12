#!/bin/bash
# Installs a user-local Node.js LTS into ~/slate360-engines/node (no sudo/root
# needed, matching how colmap-4.1.0 and nerfstudio are organized on this
# machine). Fixes a real gap: the pipeline's sanitized WSL PATH
# (lib/splat-lab/wsl.ts CLEAN_PATH) never included any Node.js, so
# `shutil.which("npx")` in workers/local/splat-lab/stages/export.py always
# returned None and every export silently fell back to serving the raw,
# uncompressed .ply instead of running `npx @playcanvas/splat-transform`
# to produce a much smaller .spz/.sog.
set -euo pipefail
DEST=/home/rian_/slate360-engines/node
VERSION=20.18.1
URL="https://nodejs.org/dist/v${VERSION}/node-v${VERSION}-linux-x64.tar.xz"

if [ -x "$DEST/bin/node" ]; then
  echo "already installed: $("$DEST/bin/node" --version)"
  exit 0
fi
mkdir -p "$DEST"
TMP=$(mktemp -d)
curl -fL --retry 3 -o "$TMP/node.tar.xz" "$URL"
tar -xJf "$TMP/node.tar.xz" -C "$TMP"
cp -r "$TMP/node-v${VERSION}-linux-x64/"* "$DEST/"
rm -rf "$TMP"
echo "installed: $("$DEST/bin/node" --version), npm $("$DEST/bin/npm" --version)"
