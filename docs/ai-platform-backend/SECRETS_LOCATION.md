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

## Claude Code **web** sessions: secrets will not help, do not send them

Options 2 and 3 above assume a machine with open outbound network. **A Claude Code web session
does not have one.** Verified 2026-07-27 from inside such a session:

```
api.github.com     -> HTTP 200      allowed
api.modal.com      -> CONNECT tunnel failed, 403
api.supabase.com   -> CONNECT tunnel failed, 403
api.vercel.com     -> CONNECT tunnel failed, 403
```

The 403 comes from the environment's egress policy and happens **before TLS, before any token is
offered**. So copying `.local/ai-platform-backend/` into a web session would expose every key in
a chat transcript *and still fail* — `modal profile current` cannot reach `api.modal.com` no
matter what `~/.modal.toml` contains.

**For a web session, option 1 is the only one that works — via teleport rather than a copy:**

```bash
cd C:\s360
claude --teleport          # brings the cloud session's branch AND history to this machine
```

Everything then runs with the credentials already installed here. Full diagnosis and the
alternative (changing the environment's network policy) in
`docs/ops/WEB_SESSION_BACKEND_ACCESS.md`.
