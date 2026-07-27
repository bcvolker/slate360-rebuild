# Secrets location (not in git)

GitHub **Push Protection** blocked committing live keys to this repo.

On Brian's machine the full secrets pack lives at:

```
.local/ai-platform-backend/
  DEV_SECRETS.env      ← copy to repo-root .env.local
  CLI_TOKENS.env       ← Vercel + Modal tokens
  modal.toml           ← copy to ~/.modal.toml
  vercel-auth.json
  vercel-config.json
  github-pat.txt
```

That folder is gitignored (`.local/`).

## How another AI gets the secrets

1. **Best:** run on this same Windows machine (C:\s360) — .env.local and .local/ai-platform-backend/ already exist.
2. **Or:** Brian copies .local/ai-platform-backend/ to the other platform out-of-band (USB, encrypted zip, private channel) — do **not** commit it.
3. **Or:** recreate .env.local via `npx vercel env pull .env.local --environment=production` after Vercel CLI auth, then add Trigger/Modal-only vars from Brian.

Do not attempt to force-push secrets into git — GitHub will reject or auto-revoke them.
