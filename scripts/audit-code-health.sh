#!/usr/bin/env bash
# scripts/audit-code-health.sh
# Static analysis: catches technical debt, ghost files, and placeholder code.
# Run: bash scripts/audit-code-health.sh

set -euo pipefail
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'
FAIL=0

echo "═══════════════════════════════════════════════════"
echo "  Slate360 Code Health Audit"
echo "═══════════════════════════════════════════════════"
echo ""

# 1. File size violations (300 line limit)
echo "▸ Checking file sizes (300 line limit)..."
OVERSIZE=$(find app components lib -name '*.ts' -o -name '*.tsx' | \
  xargs wc -l 2>/dev/null | sort -rn | \
  awk '$1 > 300 && $2 != "total" {print $0}')
if [ -n "$OVERSIZE" ]; then
  echo -e "${RED}FAIL: Files over 300 lines:${NC}"
  echo "$OVERSIZE"
  FAIL=1
else
  echo -e "${GREEN}PASS: All files under 300 lines${NC}"
fi
echo ""

# 2. Banned 'any' type usage
echo "▸ Checking for banned 'any' type..."
ANY_COUNT=$(grep -rn --include='*.ts' --include='*.tsx' -P ': any\b|as any\b|<any>' app/ components/ lib/ 2>/dev/null | \
  grep -v node_modules | grep -v _deprecated | wc -l)
if [ "$ANY_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}WARN: $ANY_COUNT occurrences of 'any' type found:${NC}"
  grep -rn --include='*.ts' --include='*.tsx' -P ': any\b|as any\b|<any>' app/ components/ lib/ 2>/dev/null | \
    grep -v node_modules | grep -v _deprecated | head -20
  echo "  ... (showing first 20)"
else
  echo -e "${GREEN}PASS: No 'any' types found${NC}"
fi
echo ""

# 3. Dead href="#" links
echo "▸ Checking for dead href=\"#\" links..."
DEAD_LINKS=$(grep -rn 'href="#"' app/ components/ --include='*.tsx' --include='*.ts' 2>/dev/null | \
  grep -v node_modules | grep -v _deprecated || true)
if [ -n "$DEAD_LINKS" ]; then
  echo -e "${RED}FAIL: Dead links found:${NC}"
  echo "$DEAD_LINKS"
  FAIL=1
else
  echo -e "${GREEN}PASS: No dead href=\"#\" links${NC}"
fi
echo ""

# 4. Console.log in production code
echo "▸ Checking for console.log statements..."
CONSOLE_COUNT=$(grep -rn --include='*.tsx' 'console\.log' app/ components/ 2>/dev/null | \
  grep -v node_modules | grep -v _deprecated | grep -v '\.spec\.' | wc -l)
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}WARN: $CONSOLE_COUNT console.log statements in UI code:${NC}"
  grep -rn --include='*.tsx' 'console\.log' app/ components/ 2>/dev/null | \
    grep -v node_modules | grep -v _deprecated | grep -v '\.spec\.' | head -10
else
  echo -e "${GREEN}PASS: No console.log in UI code${NC}"
fi
echo ""

# 5. Placeholder/mock text in production components
echo "▸ Checking for placeholder/mock text..."
PLACEHOLDER_COUNT=$(grep -rn --include='*.tsx' -iP 'placeholder for|under construction|lorem ipsum|mock data|FIXME:|TODO:' \
  app/ components/ 2>/dev/null | \
  grep -v node_modules | grep -v _deprecated | grep -v '\.spec\.' | \
  grep -v 'placeholder=' | grep -v 'placeholder:' | grep -v 'placeholder"' | wc -l)
if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}WARN: $PLACEHOLDER_COUNT placeholder/mock references:${NC}"
  grep -rn --include='*.tsx' -iP 'placeholder for|under construction|lorem ipsum|mock data|FIXME:|TODO:' \
    app/ components/ 2>/dev/null | \
    grep -v node_modules | grep -v _deprecated | grep -v '\.spec\.' | \
    grep -v 'placeholder=' | grep -v 'placeholder:' | grep -v 'placeholder"' | head -15
else
  echo -e "${GREEN}PASS: No placeholder/mock text found${NC}"
fi
echo ""

# 6. Old tier names in code ("creator"/"model" tiers)
echo "▸ Checking for old tier names (creator/model)..."
OLD_TIERS=$(grep -rn --include='*.ts' --include='*.tsx' -P '"creator"|"model"' app/ components/ lib/ 2>/dev/null | \
  grep -v node_modules | grep -v _deprecated | grep -v context | \
  grep -v '3d.*model\|3D.*model\|Model.*3d\|viewer\|ModelViewer\|\.glb\|\.gltf' | \
  grep -v 'backward\|legacy\|compat\|fallback\|mapping\|"model "' || true)
if [ -n "$OLD_TIERS" ]; then
  echo -e "${YELLOW}WARN: Old tier references found:${NC}"
  echo "$OLD_TIERS" | head -10
else
  echo -e "${GREEN}PASS: No old tier names in active code${NC}"
fi
echo ""

# 7. Ghost _deprecated folder
echo "▸ Checking for deprecated ghost files..."
if [ -d "app/_deprecated" ]; then
  GHOST_COUNT=$(find app/_deprecated -type f | wc -l)
  echo -e "${RED}FAIL: app/_deprecated/ exists with $GHOST_COUNT files — should be deleted${NC}"
  FAIL=1
else
  echo -e "${GREEN}PASS: No _deprecated folder${NC}"
fi
echo ""

echo "═══════════════════════════════════════════════════"
if [ "$FAIL" -eq 1 ]; then
  echo -e "${RED}  AUDIT FAILED — fix issues above before shipping${NC}"
  exit 1
else
  echo -e "${GREEN}  AUDIT PASSED (warnings are advisory)${NC}"
  exit 0
fi
