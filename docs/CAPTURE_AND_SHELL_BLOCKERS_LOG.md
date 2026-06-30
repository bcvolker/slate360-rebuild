# Capture-Screen + App-Shell Blockers — Evidence Log (2026-06-30)

Brian has fought these for ~1 month across many chats with no resolution. Logged here with
screenshot evidence + root-cause so they stop recurring. **Verdict up front: all THREE are
fixable. None require a project restart.** The reason prior attempts failed is diagnosed below.

## BLOCKER 1 — Twin pipeline froze on "processing" (SOLVED)
- **Evidence:** Vercel env editor screenshot shows `MODAL_TWIN_ENDPOINT` = `https://api.example.com`
  (the placeholder). A Quick Scan uploaded then hung on "processing" forever.
- **Root cause:** the Trigger task POSTs the reconstruction job to `MODAL_TWIN_ENDPOINT`. With the
  placeholder value, it posts to a non-existent URL → job never dispatches → stuck "processing".
- **Fix:** set Vercel Production+Preview `MODAL_TWIN_ENDPOINT=https://bcvolker--reconstruct.modal.run`
  (the real deployed Modal app, confirmed deployed). Redeploy. Also confirm Trigger.dev is live
  (it has lapsed before on billing/concurrency — if asleep, jobs queue and the button looks dead).
- **Status:** root-caused; Brian to paste the value. Fixable: YES (config, 5 min).

## BLOCKER 2 — Twin 360 capture screen is a raw mess (DIAGNOSED — likely WEB, Vercel-fixable)
- **Evidence:** Quick Scan capture screen — TOP controls overlap the iPhone Dynamic Island
  (invisible/conflicting), MID-screen elements obscure the camera, looks raw/unprofessional.
  On-screen strings: "BACK", "STEP 1", "Ghost", "Light", "Tap to capture", "End walk".
- **Key finding:** those exact strings ("Tap to capture" / "End walk" / "Ghost" / "STEP") live in
  the **WEB** `components/capture-v2/**` canvas (CaptureCanvasTopBar/BottomRail/GhostButton) — NOT
  the native Swift HUD. **So the screen Brian sees is WEB, deployable via Vercel — no TestFlight.**
- **Why a month of edits did nothing:** effort went into the NATIVE Swift HUD (ships only via
  Codemagic, and his build predates it) while the screen actually rendering is the web capture-v2
  canvas — likely the Site-Walk canvas CROSS-WIRED into Twin (the known "capture V1/V2 reuse
  hazard"). Edits to the wrong screen → no visible change. (Confirmation agent running.)
- **Root cause (top conflict):** the web capture top bar lacks `env(safe-area-inset-top)` padding,
  so in the Capacitor WKWebView its controls sit under the Dynamic Island.
- **Root cause (clutter):** Site-Walk-only overlays (plan steps "STEP 1", Ghost, "End walk") render
  in a Twin scan where they don't belong.
- **Status:** diagnosing exact component + fix plan (agent). Fixable: YES, and via Vercel (no native
  rebuild) IF it's the web canvas as the strings indicate.

## BLOCKER 3 — App-shell layout: app name stuck in header, useless labels, blank gaps
- **Evidence:** mobile header shows `[SLATE360 logo][chip][SITE WALK / TWIN 360 name][switcher][acct]`
  — the app name is crammed into the header next to the logo. Redundant "START SCAN"/"START WALK"
  label text above the buttons. Large blank vertical gaps from conflicting padding/flex.
- **What Brian wants:** (1) move the app name OUT of the header into a prominent BRANDING BAND below
  the header (header keeps logo + switcher + account only); (2) delete the redundant START SCAN/WALK
  labels; (3) eliminate the blank gaps so content fills the screen like a normal app.
- **Status:** mapping exact header + home-content structure + padding/flex gap sources (agent).
  Fixable: YES — this is a layout restructure, not a rewrite. App-shell *restyle* comes AFTER the
  layout is fixed (Brian's sequence).

## Honest verdict
**Not a restart. Not a dead end.** Blocker 1 is a one-line config value. Blocker 2 is almost
certainly web CSS/declutter (safe-area inset + removing Site-Walk overlays from Twin) shippable via
Vercel — the month of failure traces to editing the native HUD that never renders for him. Blocker 3
is a contained mobile layout restructure. The two agents are producing exact file:line fix plans;
implementation follows in verifiable, Vercel-deployable slices.
