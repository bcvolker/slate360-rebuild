# Desktop Grok Build bootstrap (RTX 3090)

This is the **Windows desktop** with the high-end NVIDIA GPU. The laptop is for chat, git,
and wiring. Local splat training happens **here**. Cloud (Trigger → Modal) is later, after
a share link looks good enough to send to a contractor.

Repo: `https://github.com/bcvolker/slate360-rebuild`
Branch to clone: **`feat/grok-workspace`** (has this file + Phase L0 scripts).

Do **not** develop in a frozen `slate360-rebuild` checkout. Use a fresh clone or worktree.

---

## 1. Install Grok Build

PowerShell (same official installer as the laptop):

```powershell
irm https://x.ai/cli/install.ps1 | iex
grok --version
```

First launch opens a browser at `auth.x.ai`. Sign in. That is **this machine's** Grok
session — OAuth does not copy from the laptop.

Docs: https://x.ai/cli · source (do not need to clone): https://github.com/xai-org/grok-build

---

## 2. Clone the repo

```powershell
cd C:\
git clone https://github.com/bcvolker/slate360-rebuild.git C:\s360-desktop
cd C:\s360-desktop
git checkout feat/grok-workspace
```

If `git` is missing: install Git for Windows, then `gh` (`winget install GitHub.cli`).

```powershell
gh auth login
gh auth refresh -h github.com -s repo,read:org,gist,workflow
```

Click the device URL `gh` prints. Scopes must include `workflow` if you touch Actions.

---

## 3. Secrets — copy, never commit

`.env.local` is gitignored. Desktop Grok cannot mint laptop tokens. Copy the file:

1. On the **laptop**: `C:\s360\.env.local` (canonical) or `C:\s360-grok\.env.local`
2. Via USB or a **private** OneDrive folder (not a public share)
3. Onto the desktop as `C:\s360-desktop\.env.local`

Optional, same private copy:

| Laptop path | Desktop path |
|---|---|
| `%USERPROFILE%\.modal.toml` | same, after `python -m modal token new` **or** copy the file |
| `%USERPROFILE%\.grok\auth.json` | **do not copy** — run `grok` login on desktop |

Confirm names only:

```powershell
Select-String -Path C:\s360-desktop\.env.local -Pattern "^[A-Z0-9_]+=" |
  ForEach-Object { ($_ -split "=")[0] }
```

You need at least: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CEO_EMAIL`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (or `CLOUDFLARE_ACCOUNT_ID` + endpoint).

---

## 4. Node + project deps

```powershell
node -v   # 20+
cd C:\s360-desktop
npm ci
```

If `npm ci` is too heavy the first night, ingest still only needs Node + the AWS/Supabase
packages already in `package.json`. Prefer a full `npm ci` before running app code.

---

## 5. GPU factory software (desktop only)

| Tool | Why |
|---|---|
| NVIDIA Studio/Game Ready driver | `nvidia-smi` must show the 3090 |
| [Jawset Postshot](https://www.jawset.com/) | Local Gaussian trainer — no Modal bill |
| FFmpeg on PATH | `scripts/local-splat/extract-frames.mjs` |
| Insta360 Studio | L1 later (X4 equirect export). Not required for L0 |

```powershell
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
ffmpeg -version
```

WSL2 Ubuntu and CUDA Toolkit are **not** required for Postshot. Add them later for GGPS / COLMAP
research only.

---

## 6. Click-auth inside desktop Grok (same as laptop)

OAuth is per machine. After `cd C:\s360-desktop` then `grok`:

1. `/mcps` → **Vercel** → `i` → team **`slate360`** (not personal)
2. `/mcps` → **Cloudflare API** → `i` (R2/Workers tools). Fallback: env tokens + wrangler
3. GitHub MCP usually follows `gh auth login`

CLI fallbacks (work even if MCP is 403):

```powershell
npx vercel login
npx vercel teams ls
npx vercel link --yes --scope slate360 --project slate360-rebuild
```

Project MCP stubs live in `.grok/config.toml` (Supabase read-only, filesystem, kimi-k3).
They use `${SUPABASE_ACCESS_TOKEN}` — load `.env.local` in the shell if that server fails.

---

## 6b. GGPS research tree (360 PhD trainer — not the product)

GGPS is **not** in git. Get it onto this PC via OneDrive Desktop sync, USB
(`scripts/research/copy-ggps-to-usb.ps1` on the laptop), or
`git clone --recurse-submodules https://github.com/Insta360-Research-Team/GGPS.git C:\research\ggps`.

Then read `docs/research/GGPS_ON_DESKTOP.md`. To build the drag-drop app, paste
`docs/research/DESKTOP_GROK_GGPS_APP_PROMPT.md` into this desktop Grok session.

## 7. First command after Grok is up

Paste this as the first desktop Grok prompt:

```text
You are on Brian's WINDOWS DESKTOP (RTX 3090). Laptop is a separate machine.
Read in order:
  docs/GROK.md
  docs/GROK_DESKTOP_BOOTSTRAP.md
  docs/GROK_BUILD_HANDOFF_2026-09-06.md
  docs/design/LOCAL_SPLAT_PIPELINE.md
Cwd must be this clone. Do not edit a laptop path. Do not burn Modal credits to iterate splat quality.
Confirm: git branch, nvidia-smi, Test-Path .env.local (exists/missing only), ffmpeg, grok --version.
Then wait — next job is Phase L0: Postshot .spz → scripts/local-splat/ingest-splat.mjs → phone share link.
```

---

## 8. Laptop vs desktop

| | Laptop (this chat) | Desktop (3090) |
|---|---|---|
| Grok | already running | install §1 |
| Git / GitHub | yes | clone + `gh auth login` |
| `.env.local` | yes | **copy** from laptop |
| Vercel/Cloudflare MCP | click `/mcps` | click again on desktop |
| Postshot / CUDA | no (Intel iGPU) | **yes — train here** |
| Modal quality iteration | no | no — local Postshot first |
| Cloud Trigger polish | later | later, after a sellable link |

---

## 9. Access matrix (what desktop Grok still needs you to click)

| Service | In repo? | Desktop action |
|---|---|---|
| Source + L0 scripts | yes, this branch | `git clone` / `git pull` |
| GitHub API | no token in git | `gh auth login` |
| Grok itself | installer URL in this file | `irm https://x.ai/cli/install.ps1 \| iex` then browser |
| Supabase / R2 / Trigger / Stripe names | `.env.example` only | copy `.env.local` |
| Vercel team `slate360` | CLI recipes | `npx vercel login` + `/mcps` |
| Cloudflare R2 | bucket name `slate360-storage` | `/mcps` or R2 keys in env |
| Modal | worker source under `workers/modal/` | copy `~\.modal.toml` or `python -m modal token new` |
| Codemagic | `codemagic.yaml` | `CODEMAGIC_API_TOKEN` in env — freeze store submit |
| Postshot | documented | install on desktop |

Nothing in git will ever contain API keys. If desktop Grok says “missing credentials”, the
copy in §3 was skipped — not a repo problem.
