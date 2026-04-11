#!/usr/bin/env bash
set -euo pipefail

CONTINUE_DIR="$HOME/.continue"
TEMPLATE_PATH="$PWD/.devcontainer/continue-config.template.yaml"

mkdir -p "$CONTINUE_DIR"
mkdir -p "$CONTINUE_DIR/sessions"

if [[ ! -f "$CONTINUE_DIR/config.yaml" && -f "$TEMPLATE_PATH" ]]; then
  cp "$TEMPLATE_PATH" "$CONTINUE_DIR/config.yaml"
  chmod 600 "$CONTINUE_DIR/config.yaml"
fi

if [[ ! -f "$CONTINUE_DIR/.continuerc.json" ]]; then
  cat > "$CONTINUE_DIR/.continuerc.json" <<'EOF'
{
  "disableIndexing": true
}
EOF
fi

if [[ ! -f "$CONTINUE_DIR/permissions.yaml" ]]; then
  cat > "$CONTINUE_DIR/permissions.yaml" <<'EOF'
# Continue tool permissions
allow:
  - Bash
  - Edit
  - MultiEdit
  - Write
ask: []
exclude: []
EOF
fi

echo "Continue bootstrap complete"