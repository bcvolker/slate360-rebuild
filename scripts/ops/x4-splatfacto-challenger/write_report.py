"""Render the committed markdown report from SPLATFACTO_METRICS.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from paths import SPLAT_RUN  # noqa: E402

DOCS = Path("/mnt/c/s360/docs")


def _fmt(v, nd=2):
    if v is None:
        return "n/a"
    if isinstance(v, float):
        return f"{v:.{nd}f}"
    return str(v)


def main() -> int:
    metrics_path = SPLAT_RUN / "SPLATFACTO_METRICS.json"
    alt = Path("/mnt/c/s360/docs/ops/x4-splatfacto-challenger/SPLATFACTO_METRICS.json")
    src = metrics_path if metrics_path.is_file() else alt
    m = json.loads(src.read_text(encoding="utf-8"))
    a, b = m["A"], m["B"]
    ah, bh = a["holdout"], b["holdout"]
    lines = [
        "# X4 Appearance Challenger — Nerfstudio Splatfacto",
        "",
        "Fixed-camera appearance A/B on the KitchenAprilTags Route B X4 trajectory. "
        "Same 4 equatorial faces, operator masks, no nadir, and whole-panorama holdout as the Brush experiment. "
        "SfM was not rerun. Camera optimizer is **off** on both arms.",
        "",
        "## Recommendation",
        "",
    ]
    promote = (
        bh.get("psnr_mean") is not None
        and ah.get("psnr_mean") is not None
        and bh["psnr_mean"] > ah["psnr_mean"] + 0.25
        and (bh.get("ssim_mean") or 0) >= (ah.get("ssim_mean") or 0)
    )
    if promote:
        lines.append("**Promote B (bilateral grid)** if qualitative GT|A|B also looks cleaner. Antialiased PLY was not used.")
    else:
        lines.append("**Do not promote B on numbers alone** unless holdout PSNR/SSIM and the named views clearly beat A. Keep classic (non-antialiased) export.")
    lines += [
        "",
        "## Locks",
        "",
        "| Lock | Value |",
        "|---|---|",
        "| Engine | nerfstudio splatfacto **1.1.5** (Apache-2.0) |",
        "| Camera optimizer | **off** |",
        "| Poses | Route B COLMAP, OpenCV→OpenGL axes only, no recenter/rescale |",
        "| Faces | front / right / back / left @ 1200² |",
        "| Nadir | **excluded** |",
        "| Holdout | every 8th **whole panorama station** (21 panos, 84 cameras) |",
        "| Masks | YOLO person seg, white=keep, fill masks on every frame |",
        "| Rasterize | **classic** (antialiased PLY is not the winner) |",
        "| Experiment B | `--pipeline.model.use-bilateral-grid True` only |",
        "",
        "## Metrics (held-out whole panorama stations)",
        "",
        "| | A baseline | B + bilateral grid |",
        "|---|---|---|",
        f"| PSNR dB | {_fmt(ah.get('psnr_mean'))} | {_fmt(bh.get('psnr_mean'))} |",
        f"| SSIM | {_fmt(ah.get('ssim_mean'), 3)} | {_fmt(bh.get('ssim_mean'), 3)} |",
        f"| LPIPS | {_fmt(ah.get('lpips_mean'), 4)} | {_fmt(bh.get('lpips_mean'), 4)} |",
        f"| Masked PSNR | {_fmt(ah.get('psnr_masked_mean'))} | {_fmt(bh.get('psnr_masked_mean'))} |",
        f"| Holdout min PSNR | {_fmt(ah.get('psnr_min'))} | {_fmt(bh.get('psnr_min'))} |",
        f"| Gaussian count | {a.get('gaussian_count')} | {b.get('gaussian_count')} |",
        f"| Runtime s | {_fmt(a.get('runtime_sec'), 1)} | {_fmt(b.get('runtime_sec'), 1)} |",
        f"| Peak VRAM MiB | {a.get('peak_vram_mib')} | {b.get('peak_vram_mib')} |",
        "",
        "### Per-direction holdout PSNR",
        "",
        "| Face | A | B |",
        "|---|---|---|",
    ]
    faces = sorted(set(ah.get("psnr_per_face", {})) | set(bh.get("psnr_per_face", {})))
    for face in faces:
        lines.append(f"| {face} | {_fmt(ah.get('psnr_per_face', {}).get(face))} | {_fmt(bh.get('psnr_per_face', {}).get(face))} |")
    lines += [
        "",
        "## Qualitative — GT | A | B",
        "",
        "Screenshots: `docs/ops/x4-splatfacto-challenger/screenshots/`",
        "",
        "| View | File |",
        "|---|---|",
        "| fridge | `fridge_GT_A_B.jpg` |",
        "| dark cabinetry | `dark_cabinetry_GT_A_B.jpg` |",
        "| island | `island_GT_A_B.jpg` |",
        "| arch | `arch_GT_A_B.jpg` |",
        "| living opening | `living_opening_GT_A_B.jpg` |",
        "",
        "## Export",
        "",
        "Canonical PLY is classic splatfacto `ns-export gaussian-splat --ply-color-mode sh_coeffs`: means, scales, quaternions, opacity, SH DC + rest. "
        "Antialiased / mip rasterize was not enabled; Nerfstudio notes those PLYs are not necessarily compatible with classic web viewers.",
        "",
        "## Reproduce",
        "",
        "```",
        "wsl -e bash /mnt/c/s360/scripts/ops/x4-splatfacto-challenger/run.sh",
        "```",
        "",
    ]
    text = "\n".join(lines)
    (DOCS / "X4_SPLATFACTO_CHALLENGER_REPORT.md").write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
