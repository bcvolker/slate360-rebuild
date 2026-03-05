#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
# check-file-size.sh — Report source files exceeding 300 lines
# Usage: ./scripts/check-file-size.sh [threshold]
# Default threshold: 300 lines
# ────────────────────────────────────────────────────────────────
set -euo pipefail

THRESHOLD="${1:-300}"

echo "┌──────────────────────────────────────────────────────────┐"
echo "│  File Size Report — threshold: $THRESHOLD lines          │"
echo "└──────────────────────────────────────────────────────────┘"
echo ""

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

find app components lib -type f \( -name '*.ts' -o -name '*.tsx' \) \
  -exec awk -v t="$THRESHOLD" 'END{ if(NR>t) printf "  ⚠  %5d lines  %s\n", NR, FILENAME }' {} \; \
  | sort -t'/' -k2 > "$TMPFILE"

cat "$TMPFILE"

VIOLATIONS=$(wc -l < "$TMPFILE")
echo ""
if (( VIOLATIONS > 0 )); then
  echo "Found $VIOLATIONS file(s) exceeding $THRESHOLD lines."
  exit 1
else
  echo "All source files are within the $THRESHOLD-line limit."
  exit 0
fi
