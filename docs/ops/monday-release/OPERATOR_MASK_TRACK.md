# Operator mask track (interface only)

Walkthrough keyframed spherical privacy mask remains source of truth. Twin face extraction must consume the same track later. **Do not generative-fill** construction evidence behind the operator.

## Shared type

See `lib/spatial-walkthrough/operator-patch.ts`:

- `OperatorMaskKeyframe` — `t`, `yawCenter`, `yawWidth`, `pitch`, `extent`, `feather`, `style`
- `OperatorMaskTrack` — `clipId` + `keyframes[]`

Authoring (not built this week): keyframes when the stick dips through doorways.

## Walkthrough

- Existing spherical operator patch + redaction rules stay live for playback.
- For client/public publish: crop/mask Brian **before** the derivative is published.
- Time-varying yaw/pitch/extent/feather/style (logo/neutral) are fields on the keyframe. Ordinary playback uses the baked/public proxy.

## Twin / X4 face extraction

- Build spherical time-dependent operator masks from the same track.
- Exclude the operator region from Gaussian training.
- Drop nadir if the operator dominates it.
- Use iPhone metric geometry for floor truth.
- Never fabricate pixels behind the operator with AI.

Monday: preserve the interface. Do not ship a large editor.
