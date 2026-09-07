# Prompts for other AIs (Cursor / Codex) — 2026-09-06

Worktree for Grok on the laptop: `C:\s360-grok`, branch `feat/grok-workspace`.
Desktop Grok: clone that branch; splat training only. Do not both edit `C:\s360`.

---

## Cursor — native Twin 360 capture (iOS)

```text
Repo: slate360-rebuild on feat/grok-workspace. Canonical operator rule: a walk is a NAMED VISIT under a PROJECT, not a dump of files.

Web already asks for visit name + project before capture (TwinCaptureNameGate). Native iOS (ios/App/App/Plugins/LiDARCapture/) still may start an untitled session.

Do:
1. Pass the web-provided title + projectId/spaceId into TwinARKitCaptureViewController / TwinUploadSession. Do not invent a second "Quick Scan — date" string.
2. Keep one ARSession across clips in a visit (already the architecture). LiDAR depth + RGB frames belong to that visit.
3. After stop: thumbnail + title + date on the review/submit screen, one Process action — not a raw file list.
4. Do not App Store / Codemagic submit. Do not touch billing, Stripe, middleware, or existing migrations.

Verify on device if you can; otherwise say what TestFlight build is required.
```

---

## Codex — product 360 splat on gsplat (cloud, no GGPS)

```text
Read docs/design/360_SPLAT_CHANGE_LIST.md section C. You are changing workers/modal/twin-gaussian-splat/ only as needed.

Problem: 360 video is unwrapped to unrelated pinhole views, then COLMAP OPENCV + splatfacto. That collapses rooms.

Do NOT copy C:\Users\bcvol\OneDrive\Desktop\ggps or OmniGS (CC BY-NC / GPL). Stay on gsplat (Apache).

Implement C2–C8:
- Sample stitched equirect video to ERP stills (0.5–2 fps).
- Stop treating cube/v360 crops as independent cameras.
- Rig-constrained poses (one world pose per timestamp) OR a spherical camera model you add to gsplat.
- Keep camera optimizer off on metric profiles.
- Latitude-weighted photometric loss if training on ERP (write it; don't paste GGPS).
- Operator mask at train time; keep the floor.

Export .spz as today. Tests for the new pose/rig path. No Modal quality iteration from this machine.
```

---

## Desktop Grok — already in repo

Paste `docs/research/DESKTOP_GROK_GGPS_APP_PROMPT.md` on the 3090 machine only.

---

## Cursor — Site Walk not Twin

Do not mix. Twin 360 operator sessions are this branch. Site Walk capture-v2 stays frozen unless Brian names it.
