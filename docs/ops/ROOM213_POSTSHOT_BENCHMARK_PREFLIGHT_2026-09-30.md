# Room 213: Postshot Splat3 benchmark, pre-flight result (2026-09-30)

**Status: STOPPED BEFORE PREPARATION.** No data was converted, nothing was installed or purchased, and nothing was trained.

## Verified from current official Jawset documentation (fetched 2026-09-30)

| Item | Finding | Source |
|---|---|---|
| Current version | **v1.1.69 (2026-08-18)** | jawset.com/docs/…/Release+Notes |
| Splat3 | Available. "Recommended profile for most scenes… can best reconstruct fine details." Max Splat Count applies. | …/Interface/Training+Configuration |
| Licence | **Free:** non-commercial only, **no PLY/SPZ export**. **Indie:** commercial use, PLY/SPZ export, **no CLI**. **Studio:** adds CLI and >4K/HDR. **Prices are not displayed** (the page shows €0.00 placeholders), so they must be confirmed. | jawset.com/shop/pricing |
| Export | PLY and SPZ on Indie and Studio | pricing; …/Radiance+Field+Export |
| Resolution | Free/Indie "up to 4K, SDR (8-bit)". Our perspective training faces are 1718² (fine). Optional "Limit Image Size"; no default maximum stated. | pricing; Training Configuration |
| Masks | Separate black/white images, same resolution and base filename. **"Remove Occluders": white = ignored.** That is the inverse of Spirula's masks (white = train), so ours would be inverted. | Training Configuration (via jawset docs search) |
| COLMAP import | cameras/images/points3D (.bin or .txt). With imported poses, Postshot "will skip the image selection and camera tracking stages". The camera model list is not documented beyond "lens distortion parameters… must match the imported image files". Our faces are undistorted PINHOLE, so they qualify. | …/Importing+Images |
| Keep original resolution | Yes, if "Limit Image Size" is off (1718² < 4K) | Training Configuration |
| GPU / OS | **Windows 10+, NVIDIA GPU with compute capability ≥ 7.5** (RTX 2060 or better). VRAM and RAM are not specified. | jawset.com |
| Training length | "Stop Training After" N steps, with a default estimated from the image count. The docs describe typical image counts of 100–300; our dataset is 5,080 faces. | Training Configuration |

## Blockers

1. **No suitable machine.** This laptop has only "Intel(R) Graphics", no NVIDIA GPU. Postshot can't run on Modal (it is Windows-only and closed source).
2. **Licence needed.** The Free tier is non-commercial and can't export, so it can't do the delivery check and doesn't fit commercial-development evaluation. **Indie (or Studio)** must be bought by Brian; the price isn't shown publicly.
3. **GUI-only on Indie.** Without Studio's CLI, someone has to operate Postshot interactively on the Windows/NVIDIA machine.

## Estimates, if unblocked

**Human setup:**
- Data export: ~2 h of Claude time, automated on Modal. It covers:
  - A's exact 5,080 PINHOLE training faces (1718², f = c = 859) from the frozen frames;
  - inverted masks;
  - COLMAP `.bin` with A's poses and points;
  - a reprojection check of the conversion;
  - the holdout list.
- Transfer: about 9–10 GB of JPEG faces plus masks.
- Machine: about 0.5 h on an existing RTX PC. A cloud Windows GPU VM takes about 1–2 h the first time, and GPU quota approval can add days.
- Postshot operation: about 0.5 h of hands-on time, by Brian or someone at the Windows machine.

**GPU time:** **not documented.** Estimated 2–6 h for about 5,000 images at 1718² with Splat3 on a 24 GB card. VRAM could force "Limit Image Size", which would break resolution parity.

**Licence:** Indie or Studio, price to be confirmed on jawset.com.

**Total before training:** about 2–4 engineering hours *after* a Windows/NVIDIA machine and a licence exist. Without those, the benchmark cannot start.

## What is needed to proceed (Brian's decision)

1. Provide a Windows 10+ PC with an NVIDIA RTX GPU, ideally 24 GB VRAM, or approve a cloud Windows GPU VM.
2. Buy a Postshot Indie licence (or Studio, for the CLI).
3. Decide who operates the Postshot GUI.

Once those exist, the data export and reprojection validation can be done first (about 2 h), then the single Splat3 run and the evaluation.
