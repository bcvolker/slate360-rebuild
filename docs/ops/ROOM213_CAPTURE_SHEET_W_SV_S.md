# Room 213 small-section capture sheet: W / SV / S (for the 2026-09-30 plan)

**Product goal:** walking video (W) that produces a sharp, stable model.
- **SV** (stationary video) and **S** (stills) are diagnostic controls only.
- W's training set never includes SV frames.

## 0. Home .insp test (before Room 213)

**Where and what:** any textured room at home. Take **6** photos (4 minimum), each 30–50 cm from the last, all at the same height, all facing the same wall or furniture.

**Settings:** the same as §2.

**Send:** copy the `.insp` files to `C:\Users\bcvol\OneDrive\Desktop\Insta360\home_insp_test\` and tell Claude.

**What it checks:** format, lens split, sizes, rig and basic registration. It does not validate calibration.

**Command** (run by Claude): `python insp_home.py home1 <files>` from `workers/modal/room213-capture`.

## 1. Section

**Choose one window bay** with a table end within about 1 m of the window wall and one chair tucked in.
- **Targets:** window reveal, carpet, table edge and leg, chair slats.
- **Box:** about 1.5 m wide × 1.2 m deep, floor to 1.8 m. Nothing moves once you begin; lights and blinds are fixed; no people or gear in the box.
- **Tape marks:** the SV and still positions, placed outside the box.

## 2. Camera settings

**Video (W and SV):** exactly the 9/29 settings of clip 079 (8K 360 video). Do not change anything between W and SV.

**Photo (S):**
- 360 Photo, 72 MP.
- Format: **INSP** or **INSP + DNG**. Never JPG.
- HDR, interval, burst and PureShot off.
- Manual: ISO 100, about 1/30 s (1/15 if dark). White balance fixed (e.g. 4800 K).
- Check the first photo: the file ends in `.insp`, about 15–30 MB, and shows two circles side by side.

**Mounting (S and SV):** light stand or tripod with the invisible selfie stick, upright. The shutter-button lens faces the box centre. Set height with a tape measure to the lens centre.

**Triggering (S and SV):** 3 s timer or the app remote. You stand at least 3 m away, behind the rear lens, and hold still.

## 3. Order and positions

Distances are to the box centre, which is about 0.6 m out from the wall at the middle of the window. Angle 0° faces the window straight on.

**1. W: walking video, one file, about 90 s, NO stops**
- Loop 1: walk around the box at about 1.5 m radius, lens height about 1.2 m, normal slow pace (about 0.5 m/s).
- Loop 2: the same loop at about 1.8 m lens height.
- Pass directly over the six SV tape marks at the matching height, so W has frames near every SV viewpoint.

**2. SV: stationary video, one short file per position, 5 s each, hands off**
- Six positions:
  - inner arc (1.2 m) at −60°, 0°, +60°, lens 1.2 m;
  - outer arc (2.0 m) at −30°, +30°, lens 1.8 m;
  - inner arc 0°, lens 0.7 m.
- Each file is start → step away → wait 5 s → stop.

**3. S training: 30 stills**
- 10 floor spots: 1.2 m and 2.0 m arcs at −60°, −30°, 0°, +30°, +60°.
- × 3 lens heights: 0.7, 1.2, 1.7 m.

**4. S holdouts: 4 stills**, never used for training. All on a 1.6 m arc:

| Holdout | Angle | Lens height |
|---|---|---|
| H1 | −45° | 1.0 m |
| H2 | −15° | 1.45 m |
| H3 | +15° | 0.95 m |
| H4 | +45° | 1.45 m |

**5. Optional:** 20 s of walking video at the end, to prove nothing moved.

**Timing:** about 40–50 minutes on site.

## 4. What happens next (no training until these gates pass)

- **Source analysis, per target:** W vs SV vs S. Report sharpness (per-band real detail) and cross-view consistency separately, at comparable angular scale and at SV-matched W viewpoints.
- **Holdout poses:** localised against the training-only SfM, never used in training (see `ROOM213_INSP_PREFLIGHT_2026-09-30.md`).
- **Training order:**
  1. TEST-W.
  2. TEST-S.
  3. TEST-SV only if SV is materially sharper or more consistent than W.
  4. TEST-H only if photo-vs-video local agreement passes and it would answer an open question.
- **Budget:** ≤ $10.
