# Operator-free output policy

Construction truth first. No generative fill.

## Construction default (CLIENT)

- Smallest practical unavailable rear / nadir sector
- Neutral fill only (no branded rectangle unless Brian explicitly selects it)
- Shortest-path yaw interpolation across ±180
- If the interpolated sector would dominate the frame (`yawWidth > 150`): **SKIP** that interval in the derivative instead of a giant occlusion
- MASTER is never rewritten

## Marketing default (PUBLIC)

Same geometry as construction unless a separate marketing profile is chosen later.

Marketing may later pick a branded treatment. That choice is stored as mask-type metadata. It is not the construction default.

## Forbidden

- Generative inpainting / fake walls / fake floor
- Giant logo block
- Obvious whole-frame blur
- Using MASTER poster/hero for portal, project thumb, public poster, or client poster

## Skip vs look-behind

Do not lock the entire sphere from looking behind unless that sector contains no project evidence and Brian chose that fallback. Prefer a tight nadir/rear sector; otherwise cut the time range out of the CLIENT/PUBLIC file.
