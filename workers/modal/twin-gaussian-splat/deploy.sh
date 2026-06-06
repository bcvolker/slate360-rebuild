#!/usr/bin/env bash
# Deploy Slate360 Digital Twin Modal GPU worker.
# Requires: modal CLI (pip install modal), authenticated Modal account.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Deploying Modal app from ${SCRIPT_DIR}/worker.py ..."
modal deploy worker.py

echo
echo "Deployment complete."
echo
echo "Resolve the web endpoint URL (this becomes MODAL_TWIN_ENDPOINT):"
echo "  modal app list"
echo "  modal app show slate360-twin-gaussian-splat"
echo
echo "Look for the 'reconstruct' FastAPI endpoint URL, e.g.:"
echo "  https://<workspace>--slate360-twin-gaussian-splat-reconstruct.modal.run"
echo
echo "Set that value in Vercel / Trigger.dev as MODAL_TWIN_ENDPOINT (must match GPU_WORKER_SECRET_KEY)."
