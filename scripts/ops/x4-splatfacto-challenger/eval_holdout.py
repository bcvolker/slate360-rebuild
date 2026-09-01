"""Holdout eval of exported classic PLYs. Same OpenCV cameras as Brush/V2."""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from paths import CONFIG, SHARED, SPLAT_RUN  # noqa: E402

SH_DEGREE = 3


def ssim(img, gt, c1=0.01 ** 2, c2=0.03 ** 2):
    import torch.nn.functional as F

    k = 11
    pad = k // 2
    mu_x = F.avg_pool2d(img, k, 1, pad)
    mu_y = F.avg_pool2d(gt, k, 1, pad)
    sig_x = F.avg_pool2d(img * img, k, 1, pad) - mu_x * mu_x
    sig_y = F.avg_pool2d(gt * gt, k, 1, pad) - mu_y * mu_y
    sig_xy = F.avg_pool2d(img * gt, k, 1, pad) - mu_x * mu_y
    ssim_map = ((2 * mu_x * mu_y + c1) * (2 * sig_xy + c2)) / (
        (mu_x * mu_x + mu_y * mu_y + c1) * (sig_x + sig_y + c2)
    )
    return float(ssim_map.mean().item())


def load_exported_ply(path: Path):
    import torch

    raw = Path(path).read_bytes()
    end = raw.find(b"end_header\n")
    header = raw[:end].decode("ascii", "replace")
    n = None
    props = []
    for line in header.splitlines():
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
        if line.startswith("property "):
            bits = line.split()
            props.append((bits[1], bits[2]))
    type_map = {"float": "<f4", "double": "<f8", "uchar": "u1"}
    dt = np.dtype([(name, type_map.get(typ, "<f4")) for typ, name in props])
    arr = np.frombuffer(raw[end + len(b"end_header\n") :], dtype=dt, count=n)
    names = {name for _, name in props}
    means = np.column_stack([arr["x"], arr["y"], arr["z"]]).astype(np.float32)
    sh0 = np.column_stack([arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"]]).astype(np.float32)
    rest_keys = [k for k in names if k.startswith("f_rest_")]
    rest_keys.sort(key=lambda k: int(k.split("_")[-1]))
    if rest_keys:
        rest = np.stack([arr[k] for k in rest_keys], axis=1)
        shn = rest.reshape(n, -1, 3)
    else:
        shn = np.zeros((n, 0, 3), np.float32)
    opac = np.asarray(arr["opacity"], dtype=np.float32).reshape(-1)
    scales = np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]]).astype(np.float32)
    quats = np.column_stack([arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"]]).astype(np.float32)
    device = torch.device("cuda")
    # ns-export writes logit opacity and log scales (Inria / splatfacto raw params).
    return {
        "means": torch.from_numpy(means).to(device),
        "scales": torch.from_numpy(scales).to(device),
        "quats": torch.from_numpy(quats).to(device),
        "opacities": torch.from_numpy(opac).to(device),
        "sh0": torch.from_numpy(sh0).to(device)[:, None, :],
        "shN": torch.from_numpy(shn.astype(np.float32)).to(device),
    }, int(n)


def render_cam(params, rec, device, sh_degree: int):
    import torch
    import torch.nn.functional as F
    from gsplat.rendering import rasterization

    colors = torch.cat([params["sh0"], params["shN"]], dim=1)
    sh_n = int(params["shN"].shape[1])
    sh_degree = 0 if sh_n == 0 else SH_DEGREE
    render, _, _ = rasterization(
        means=params["means"],
        quats=F.normalize(params["quats"], dim=-1),
        scales=torch.exp(params["scales"]),
        opacities=torch.sigmoid(params["opacities"]),
        colors=colors,
        viewmats=torch.tensor(rec["view"], dtype=torch.float32, device=device)[None],
        Ks=torch.tensor(rec["K"], dtype=torch.float32, device=device)[None],
        width=int(rec["w"]),
        height=int(rec["h"]),
        packed=False,
        sh_degree=sh_degree,
        render_mode="RGB",
    )
    return render[0].clamp(0, 1)


def maybe_lpips():
    try:
        import lpips
        import torch

        net = lpips.LPIPS(net="alex").to("cuda").eval()

        def _fn(pred, gt):
            a = pred * 2 - 1
            b = gt * 2 - 1
            with torch.no_grad():
                return float(net(a[None], b[None]).item())

        return _fn
    except Exception as exc:  # noqa: BLE001
        print(f"LPIPS unavailable: {exc}", flush=True)
        return None


def eval_split(params, cameras, image_dir: Path, mask_dir: Path | None, device, lpips_fn):
    import torch
    import cv2

    by_face: dict[str, dict[str, list[float]]] = {}
    psnrs, ssims, lpips_vals, psnrs_masked = [], [], [], []
    for rec in cameras:
        arr = cv2.cvtColor(cv2.imread(str(image_dir / rec["name"])), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        gt = torch.from_numpy(arr).to(device=device)
        pred = render_cam(params, rec, device, SH_DEGREE)
        mse = float(((pred - gt) ** 2).mean().item())
        psnr = 10.0 * math.log10(1.0 / max(mse, 1e-12))
        s = ssim(pred.permute(2, 0, 1)[None], gt.permute(2, 0, 1)[None])
        psnrs.append(psnr)
        ssims.append(s)
        if lpips_fn is not None:
            lpips_vals.append(lpips_fn(pred.permute(2, 0, 1), gt.permute(2, 0, 1)))
        if mask_dir is not None:
            mpath = mask_dir / f"{Path(rec['name']).stem}.png"
            if mpath.is_file():
                mask = cv2.imread(str(mpath), cv2.IMREAD_GRAYSCALE)
                keep = torch.from_numpy((mask > 127).astype(np.float32)).to(device)
                denom = float(keep.sum().clamp_min(1.0))
                mse_m = float((((pred - gt) ** 2).sum(-1) * keep).sum().item() / denom)
                psnrs_masked.append(10.0 * math.log10(1.0 / max(mse_m, 1e-12)))
        bucket = by_face.setdefault(rec["face"], {"psnr": [], "ssim": []})
        bucket["psnr"].append(psnr)
        bucket["ssim"].append(s)
    per_face = {
        face: {
            "psnr": float(np.mean(v["psnr"])),
            "ssim": float(np.mean(v["ssim"])),
            "n": len(v["psnr"]),
        }
        for face, v in by_face.items()
    }
    out = {
        "n": len(cameras),
        "psnr_mean": float(np.mean(psnrs)) if psnrs else None,
        "psnr_min": float(np.min(psnrs)) if psnrs else None,
        "ssim_mean": float(np.mean(ssims)) if ssims else None,
        "lpips_mean": float(np.mean(lpips_vals)) if lpips_vals else None,
        "psnr_masked_mean": float(np.mean(psnrs_masked)) if psnrs_masked else None,
        "psnr_per_face": {k: v["psnr"] for k, v in per_face.items()},
        "ssim_per_face": {k: v["ssim"] for k, v in per_face.items()},
        "per_direction": per_face,
    }
    return out


def side_by_sides(params_a, params_b, cameras, image_dir: Path, out_dir: Path, device):
    import cv2
    import torch

    named = CONFIG["named_views"]
    out_dir.mkdir(parents=True, exist_ok=True)
    for spec in named:
        cand = [c for c in cameras if c["face"] == spec["face"]]
        rec = min(cand, key=lambda c: abs(c["t"] - spec["t"]))
        gt = cv2.cvtColor(cv2.imread(str(image_dir / rec["name"])), cv2.COLOR_BGR2RGB)
        with torch.no_grad():
            a = (render_cam(params_a, rec, device, SH_DEGREE).detach().cpu().numpy() * 255).astype(np.uint8)
            b = (render_cam(params_b, rec, device, SH_DEGREE).detach().cpu().numpy() * 255).astype(np.uint8)
        trip = np.concatenate([gt, a, b], axis=1)
        stem = spec["id"]
        cv2.imwrite(str(out_dir / f"{stem}_gt.jpg"), cv2.cvtColor(gt, cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(out_dir / f"{stem}_A.jpg"), cv2.cvtColor(a, cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(out_dir / f"{stem}_B.jpg"), cv2.cvtColor(b, cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(out_dir / f"{stem}_GT_A_B.jpg"), cv2.cvtColor(trip, cv2.COLOR_RGB2BGR))


def main() -> int:
    import torch

    p = argparse.ArgumentParser()
    p.add_argument("--data", default=str(SHARED))
    p.add_argument("--run", default=str(SPLAT_RUN))
    args = p.parse_args()
    data = Path(args.data)
    run = Path(args.run)
    cameras = json.loads((data / "cameras.json").read_text())
    hold = [c for c in cameras if c["role"] == "holdout"]
    train = [c for c in cameras if c["role"] == "train"]
    image_dir = data / "images"
    mask_dir = data / "masks"
    device = torch.device("cuda")
    lpips_fn = maybe_lpips()
    results = {}
    params = {}
    for exp in ("A", "B"):
        ply = run / exp / "export" / f"splatfacto_{exp}.ply"
        params[exp], n = load_exported_ply(ply)
        train_stats = json.loads((run / exp / "TRAIN_STATS.json").read_text()) if (run / exp / "TRAIN_STATS.json").is_file() else {}
        export_stats = json.loads((run / exp / "export" / "EXPORT.json").read_text()) if (run / exp / "export" / "EXPORT.json").is_file() else {}
        with torch.no_grad():
            hold_m = eval_split(params[exp], hold, image_dir, mask_dir if mask_dir.is_dir() else None, device, lpips_fn)
            train_m = eval_split(params[exp], train[:: max(1, len(train) // 24)], image_dir, None, device, None)
        results[exp] = {
            "gaussian_count": n,
            "runtime_sec": train_stats.get("runtime_sec"),
            "peak_vram_mib": train_stats.get("peak_vram_mib"),
            "bilateral_grid": train_stats.get("bilateral_grid"),
            "camera_optimizer": "off",
            "holdout": hold_m,
            "train_subsample": train_m,
            "export": export_stats,
        }
        del params[exp]
        torch.cuda.empty_cache()

    params_a, _ = load_exported_ply(run / "A" / "export" / "splatfacto_A.ply")
    params_b, _ = load_exported_ply(run / "B" / "export" / "splatfacto_B.ply")
    shots = run / "screenshots"
    docs_shots = Path("/mnt/c/s360/docs/ops/x4-splatfacto-challenger/screenshots")
    with torch.no_grad():
        side_by_sides(params_a, params_b, cameras, image_dir, shots, device)
        side_by_sides(params_a, params_b, cameras, image_dir, docs_shots, device)

    payload = {
        "engine": "nerfstudio splatfacto 1.1.5",
        "license": "Apache-2.0",
        "sfm_rerun": False,
        "camera_optimizer": "off",
        "faces": ["front", "right", "back", "left"],
        "nadir": False,
        "holdout_unit": "entire panorama timestamps every 8th",
        "rasterize_mode": "classic",
        "antialiased_ply_as_winner": False,
        "A": results["A"],
        "B": results["B"],
    }
    (run / "SPLATFACTO_METRICS.json").write_text(json.dumps(payload, indent=2) + "\n")
    docs = Path("/mnt/c/s360/docs/ops/x4-splatfacto-challenger")
    docs.mkdir(parents=True, exist_ok=True)
    (docs / "SPLATFACTO_METRICS.json").write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
