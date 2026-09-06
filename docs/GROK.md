# Grok — start here

Any new Grok / Grok Build session must read this file first.

**Machine split (locked)**

| Machine | Role |
|---|---|
| **Laptop** | Chat, git, wiring, this session’s worktree `C:\s360-grok` |
| **Desktop (RTX 3090)** | Local Gaussian training (Postshot), ingest `.spz`, share-link QA |

If you are on the **desktop**, read next:

**→ [docs/GROK_DESKTOP_BOOTSTRAP.md](GROK_DESKTOP_BOOTSTRAP.md)**

Then the locked product briefing:

**→ [docs/GROK_BUILD_HANDOFF_2026-09-06.md](GROK_BUILD_HANDOFF_2026-09-06.md)**

Then the operator SOP:

**→ [docs/design/LOCAL_SPLAT_PIPELINE.md](design/LOCAL_SPLAT_PIPELINE.md)**

360 / GGPS (desktop PhD only):

**→ [docs/research/GGPS_ON_DESKTOP.md](research/GGPS_ON_DESKTOP.md)**  
**→ [docs/research/GGPS_DROP_APP.md](research/GGPS_DROP_APP.md)** (desktop drop UI)  
**→ [docs/research/DESKTOP_GROK_GGPS_APP_PROMPT.md](research/DESKTOP_GROK_GGPS_APP_PROMPT.md)**  
**→ [docs/design/360_SPLAT_CHANGE_LIST.md](design/360_SPLAT_CHANGE_LIST.md)**

The dated handoff wins on business model, capture strategy, and build order when it conflicts
with older `SESSION_HANDOFF.md`. Still obey `CLAUDE.md` for git/guards/tokens/no-`git add .`.

Branch that contains the desktop bootstrap + L0 scripts: **`feat/grok-workspace`**.
