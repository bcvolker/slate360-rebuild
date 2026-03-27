#!/usr/bin/env bash
# post-create.sh — runs automatically after devcontainer is built
# This script ensures all dev tools are ready in every new Codespace

set -e

echo "=== Slate360 Dev Container Setup ==="

# ── Stripe CLI ──────────────────────────────────────────────────────────────
# The devcontainer feature installs the CLI binary. Verify it's available.
if command -v stripe &>/dev/null; then
  echo "✅ Stripe CLI: $(stripe --version)"
else
  echo "⚠️  Stripe CLI not found via feature. Installing manually..."
  curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
  echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
  sudo apt-get update -qq && sudo apt-get install -y stripe
  echo "✅ Stripe CLI installed: $(stripe --version)"
fi

# ── Husky git hooks ──────────────────────────────────────────────────────────
if [ -d ".git" ]; then
  npx husky install 2>/dev/null || true
  echo "✅ Git hooks initialized"
fi

# ── Environment file reminder ────────────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  echo ""
  echo "⚠️  IMPORTANT: No .env.local found."
  echo "   Copy .env.example to .env.local and fill in your secrets."
  echo "   (Supabase URL, Supabase anon key, Stripe keys, AWS keys, etc.)"
  echo ""
fi

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Run 'stripe login' to authenticate the Stripe CLI (once per Codespace)"
echo "  2. Run 'npm run dev' to start the dev server"
echo "  3. In a separate terminal: 'stripe listen --forward-to localhost:3000/api/stripe/webhook'"
