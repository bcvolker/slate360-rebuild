# Grok Bot coordination — 2026-09-17 PT

**Written:** 2026-09-17 (Pacific)  
**Author:** Grok Bot (Cursor cloud assistant, repo `slate360-rebuild`)  
**Audience:** Desktop / local Cursor AI on Brian’s Windows machine (`C:\s360`)  
**Scope:** Coordination only. This file does not change application code, workers, package.json, experiment configs, or running jobs.

---

## 1. What Grok Bot did

Read-only diagnosis of `slate360-rebuild` plus capture-library context. Received Brian’s comprehensive technical handoff, including:

- Room 213 forensics
- Experiment 1: PLY = SPZ
- Resume freeze at step 2250
- Experiment 2 currently running Arm A / Arm B

No code or job changes were made from that pass.

---

## 2. Non-interference (hard)

Grok Bot will **not** disrupt Experiment 2, desktop GPU work, Modal jobs, or branch `feature/recon-controlled-experiment-v1`.

Do not restart, kill, or retarget those jobs on Grok Bot’s behalf. Interior and aerial recipes must stay isolated. Stadium aerial splat job **`2bb07176`** is a protected benchmark — do not overwrite it with an interior recipe, and do not overwrite interior recipes with the aerial one.

---

## 3. Parallel research (Grok Bot)

While Exp 2 continues, Grok Bot is researching in parallel (docs / literature only; no training-code edits):

- Nerfstudio Splatfacto optimizer restore after checkpoint / grow-prune
- gsplat 1.5.3 opacity reset
- Densify / cull practices

This research is a second-opinion track. It does not change live experiment arms.

---

## 4. Commercial constraints (as Brian stated)

- Contractors already own drones and 360 cameras.
- The product must be high-quality **interactive 3D** plus **remote visual project management**.
- No soft-compromise deliverables.
- Revenue need: about **$7–8k / month**.
- Brian: ASU PM + construction instructor; **COI** if selling into his own unit.

---

## 5. Roadmap sensors (locked split)

| Sensor / capture | Role |
|---|---|
| Ground exterior 360 | Reality |
| Aerial 360 | Reality |
| Future handheld LiDAR (Airy / Mid-360) | Geometry |

The **Reality vs Geometry** split stays. Do not collapse the two into one recipe.

---

## 6. After Experiment 2

When Exp 2 finishes, Brian will share results with Grok Bot for a second opinion alongside other AI platforms.

**Ask of the desktop AI:** leave Exp 2 results and frozen-view verdicts in a short note Grok Bot can read.

**Suggested path (when ready):** `docs/ops/EXPERIMENT2_RESULTS.md`

Include enough for an independent review: arm A/B outcomes, frozen-view verdicts, and any “do not touch” leftovers. Do not wait for Grok Bot to request a job change.

---

## 7. Safe merge

This note is docs-only. Safe to merge to `main` anytime. It does not affect Experiment 2.
