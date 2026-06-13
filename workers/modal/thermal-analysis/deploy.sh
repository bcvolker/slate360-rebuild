#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
modal deploy worker.py
