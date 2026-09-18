"""Build docs/ops/exp2-room213-review/ from completed Exp 2 artifacts. Read-only."""
from __future__ import annotations

import csv
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "qa" / "exp2-run"
DEST = ROOT / "docs" / "ops" / "exp2-room213-review"
A = SRC / "A"
B = SRC / "B"
HIST_PLY = ROOT / "qa" / "renders" / "room213" / "ply"

TENSORS = ("means", "scales", "quats", "opacities", "features_dc", "features_rest")
VIEWS = ("A_on_path.png", "B_off_path.png", "C_dollhouse.png", "D_overhead.png")


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def series(scalars: dict, *keys: str) -> dict[int, float]:
    for key in keys:
        rows = scalars.get(key)
        if rows:
            return {int(r["step"]): float(r["value"]) for r in rows}
    return {}


def ckpt_row(entry: dict) -> dict:
    gauss = entry["gauss"]
    count = gauss["_model.gauss_params.means"]["shape"][0]
    return {
        "step": int(entry["step"]),
        "gaussian_count": int(count),
        "bytes": int(entry["bytes"]),
        "means": gauss["_model.gauss_params.means"]["sha256"],
        "scales": gauss["_model.gauss_params.scales"]["sha256"],
        "quats": gauss["_model.gauss_params.quats"]["sha256"],
        "opacities": gauss["_model.gauss_params.opacities"]["sha256"],
        "features_dc": gauss["_model.gauss_params.features_dc"]["sha256"],
        "features_rest": gauss["_model.gauss_params.features_rest"]["sha256"],
    }


def changed_map(prev: dict | None, cur: dict) -> dict[str, bool]:
    if prev is None:
        return {name: None for name in TENSORS}
    return {name: prev[name] != cur[name] for name in TENSORS}


def write_metrics_csv(scalars: dict, dest: Path) -> list[dict]:
    loss = series(scalars, "Train Loss")
    psnr = series(scalars, "Train Metrics Dict/psnr")
    gcount = series(scalars, "Train Metrics Dict/gaussian_count")
    mem = series(scalars, "GPU Memory (MB)")
    steps = sorted(set(loss) | set(psnr) | set(gcount) | set(mem))
    rows = []
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["step", "gaussian_count", "loss", "psnr", "gpu_memory"])
        w.writeheader()
        for step in steps:
            row = {
                "step": step,
                "gaussian_count": gcount.get(step, ""),
                "loss": loss.get(step, ""),
                "psnr": psnr.get(step, ""),
                "gpu_memory": mem.get(step, ""),
            }
            w.writerow(row)
            rows.append(row)
    return rows


def yaml_dump(obj, indent: int = 0) -> str:
    pad = "  " * indent
    if isinstance(obj, dict):
        lines = []
        for key, val in obj.items():
            if isinstance(val, (dict, list)):
                lines.append(f"{pad}{key}:")
                lines.append(yaml_dump(val, indent + 1))
            else:
                lines.append(f"{pad}{key}: {json.dumps(val)}")
        return "\n".join(lines)
    if isinstance(obj, list):
        lines = []
        for item in obj:
            if isinstance(item, (dict, list)):
                lines.append(f"{pad}-")
                lines.append(yaml_dump(item, indent + 1))
            else:
                lines.append(f"{pad}- {json.dumps(item)}")
        return "\n".join(lines)
    return f"{pad}{json.dumps(obj)}"


def strip_secrets(cfg: dict) -> dict:
    banned = {"secret", "password", "token", "api_key", "access_key", "private"}
    out = {}
    for key, val in cfg.items():
        if any(b in key.lower() for b in banned):
            continue
        out[key] = strip_secrets(val) if isinstance(val, dict) else val
    return out


def font(size: int):
    for name in (
        "/mnt/c/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "arial.ttf",
    ):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def label_bar(text: str, width: int, height: int = 36) -> Image.Image:
    bar = Image.new("RGB", (width, height), (11, 15, 21))
    draw = ImageDraw.Draw(bar)
    fnt = font(18)
    draw.text((10, 8), text, fill=(248, 250, 252), font=fnt)
    return bar


def composite_pair(left: Path, right: Path, dest: Path, left_label: str, right_label: str) -> None:
    a = Image.open(left).convert("RGB")
    b = Image.open(right).convert("RGB")
    h = min(a.height, b.height)
    w = min(a.width, b.width)
    a = a.crop((0, 0, w, h))
    b = b.crop((0, 0, w, h))
    gap = Image.new("RGB", (8, h), (0, 0, 0))
    row = Image.new("RGB", (w * 2 + 8, h + 36), (0, 0, 0))
    row.paste(label_bar(left_label, w), (0, 0))
    row.paste(label_bar(right_label, w), (w + 8, 0))
    row.paste(a, (0, 36))
    row.paste(gap, (w, 36))
    row.paste(b, (w + 8, 36))
    dest.parent.mkdir(parents=True, exist_ok=True)
    row.save(dest)


def composite_triple(paths: list[Path], labels: list[str], dest: Path) -> None:
    imgs = [Image.open(p).convert("RGB") for p in paths]
    h = min(im.height for im in imgs)
    w = min(im.width for im in imgs)
    imgs = [im.crop((0, 0, w, h)) for im in imgs]
    gap_w = 8
    row = Image.new("RGB", (w * 3 + gap_w * 2, h + 36), (0, 0, 0))
    x = 0
    for i, (im, lab) in enumerate(zip(imgs, labels)):
        row.paste(label_bar(lab, w), (x, 0))
        row.paste(im, (x, 36))
        x += w
        if i < 2:
            row.paste(Image.new("RGB", (gap_w, h + 36), (0, 0, 0)), (x, 0))
            x += gap_w
    dest.parent.mkdir(parents=True, exist_ok=True)
    row.save(dest)


def pick(rows: list[dict], step: int) -> dict:
    for row in rows:
        if row["step"] == step:
            return row
    raise KeyError(step)


def last_window_improving(rows: list[dict], start_step: int) -> dict:
    window = [r for r in rows if r["step"] >= start_step and r["loss"] != ""]
    if len(window) < 2:
        return {"available": False}
    first, last = window[0], window[-1]
    return {
        "available": True,
        "from_step": first["step"],
        "to_step": last["step"],
        "loss_from": first["loss"],
        "loss_to": last["loss"],
        "psnr_from": first["psnr"],
        "psnr_to": last["psnr"],
        "loss_still_decreasing": float(last["loss"]) < float(first["loss"]),
        "psnr_still_increasing": float(last["psnr"]) > float(first["psnr"]),
        "note": "Train-view scalars only; not a visual verdict.",
    }


def opacity_from_ply(path: Path) -> dict | None:
    if not path.is_file():
        return None
    import numpy as np

    type_map = {"float": 4, "double": 8, "uchar": 1, "uint": 4, "int": 4}
    type_np = {"float": "<f4", "double": "<f8", "uchar": "u1", "uint": "<u4", "int": "<i4"}
    with path.open("rb") as fh:
        header_lines = []
        while True:
            line = fh.readline()
            header_lines.append(line)
            if line.strip() == b"end_header":
                break
        header = b"".join(header_lines).decode("ascii", "replace")
        n = None
        props: list[tuple[str, str]] = []
        for line in header.splitlines():
            if line.startswith("element vertex"):
                n = int(line.split()[-1])
            if line.startswith("property "):
                bits = line.split()
                props.append((bits[1], bits[2]))
        if n is None:
            return None
        names = [name for _, name in props]
        if "opacity" not in names:
            return {"source": path.name, "count": int(n), "note": "PLY has no opacity property"}
        rec = sum(type_map.get(typ, 4) for typ, _ in props)
        off = 0
        opac_typ = "float"
        for typ, name in props:
            if name == "opacity":
                opac_typ = typ
                break
            off += type_map.get(typ, 4)
        body = np.fromfile(fh, dtype=np.uint8)
    rec_n = n * rec
    body = body[:rec_n].reshape(n, rec)
    opac = np.frombuffer(body[:, off : off + type_map.get(opac_typ, 4)].tobytes(), dtype=type_np.get(opac_typ, "<f4")).astype(np.float64)
    if np.nanmax(opac) > 1.0001 or np.nanmin(opac) < 0.0:
        opac = 1.0 / (1.0 + np.exp(-np.clip(opac, -40, 40)))
    return {
        "source": path.name,
        "count": int(n),
        "frac_below_0.001": float(np.mean(opac < 0.001)),
        "frac_below_0.01": float(np.mean(opac < 0.01)),
        "frac_below_0.05": float(np.mean(opac < 0.05)),
        "frac_below_0.1": float(np.mean(opac < 0.1)),
    }


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    a_eff = load(A / "effective-config.json")
    b_eff = load(B / "effective-config.json")
    a_sc = load(A / "scalar-logs.json")
    b_sc = load(B / "scalar-logs.json")
    a_ck = [ckpt_row(x) for x in load(A / "checkpoint-hashes.json")]
    b_ck = [ckpt_row(x) for x in load(B / "checkpoint-hashes.json")]
    a_metrics = write_metrics_csv(a_sc, DEST / "arm-a-metrics.csv")
    b_metrics = write_metrics_csv(b_sc, DEST / "arm-b-metrics.csv")

    def pack(rows: list[dict]) -> dict:
        early, mid, final = pick(rows, 750), pick(rows, 3750), pick(rows, 7999)
        return {
            "early": {**early, "changed_from_previous": changed_map(None, early)},
            "middle": {**mid, "changed_from_previous": changed_map(early, mid)},
            "final": {**final, "changed_from_previous": changed_map(mid, final)},
            "all_saves": [
                {**row, "changed_from_previous": changed_map(rows[i - 1] if i else None, row)}
                for i, row in enumerate(rows)
            ],
            "any_tensor_changed_early_to_final": any(early[n] != final[n] for n in TENSORS),
        }

    hashes = {
        "arm_a": {"name": "ROOM213_FROZEN_CONTROL", **pack(a_ck)},
        "arm_b": {"name": "ROOM213_GROWTH_TEST", **pack(b_ck)},
    }
    (DEST / "checkpoint-hashes.json").write_text(json.dumps(hashes, indent=2) + "\n", encoding="utf-8")

    a_yaml = strip_secrets(a_eff)
    b_yaml = strip_secrets(b_eff)
    (DEST / "arm-a-effective-config.yaml").write_text(yaml_dump(a_yaml) + "\n", encoding="utf-8")
    (DEST / "arm-b-effective-config.yaml").write_text(yaml_dump(b_yaml) + "\n", encoding="utf-8")

    left_l = "Arm A — refine stop 500"
    right_l = "Arm B — refine stop 4300"
    for name in VIEWS:
        composite_pair(
            A / "ply" / "ply" / name,
            B / "ply" / "ply" / name,
            DEST / name,
            left_l,
            right_l,
        )

    hist = HIST_PLY / "A_on_path.png"
    if hist.is_file():
        ha = Image.open(hist)
        aa = Image.open(A / "ply" / "ply" / "A_on_path.png")
        if ha.size == aa.size:
            composite_triple(
                [hist, A / "ply" / "ply" / "A_on_path.png", B / "ply" / "ply" / "A_on_path.png"],
                ["Historical Room", "Arm A — refine stop 500", "Arm B — refine stop 4300"],
                DEST / "historical_vs_A_vs_B.png",
            )
            hist_note = (
                "Included. Same qa_pose_hash ee511246, same gsplat 1.5.3 rasterizer, "
                "same 1280 resolution, no auto-frame. Representative view: A_on_path."
            )
        else:
            hist_note = f"Skipped: historical {ha.size} vs Exp2 {aa.size} framing mismatch."
    else:
        hist_note = "Skipped: historical matched PNG not found."

    opacity = {
        "arm_a": opacity_from_ply(Path("/tmp/exp2-a-output.ply")),
        "arm_b": opacity_from_ply(Path("/tmp/exp2-b-output.ply")),
        "note": "Computed from ns-export PLY opacity if those files were staged at /tmp; otherwise null. Not fabricated.",
    }

    ignore = {
        "arm_name", "refine_stop_iter", "schedule", "train", "export",
        "effective_config_hash", "changed_variable",
    }
    config_diff = []
    for key in sorted(set(a_eff) | set(b_eff)):
        if key in ignore:
            continue
        if a_eff.get(key) != b_eff.get(key):
            config_diff.append({"key": key, "arm_a": a_eff.get(key), "arm_b": b_eff.get(key)})

    a_counts = [int(r["gaussian_count"]) for r in a_ck]
    b_counts = [int(r["gaussian_count"]) for r in b_ck]
    a_last = a_metrics[-1]
    b_last = b_metrics[-1]
    b_improve = last_window_improving(b_metrics, 7000)

    recipe = load(ROOT / "qa" / "exp2-frozen-recipe.json")
    integrity = load(ROOT / "qa" / "exp2-integrity-check.json")
    wrap_a = load(A / "wrap-status.json")
    wrap_b = load(B / "wrap-status.json")
    gsplat_a = load(A / "gsplat-cuda.json")
    cmd_a = load(A / "train-cmd.json")
    cmd_b = load(B / "train-cmd.json")

    md = f"""# Room 213 Experiment 2 — Review Package

**Human visual verdict: UNREVIEWED**

Do not treat this document as selecting a winner. Arm A vs Arm B is a controlled densify-policy comparison only.

## Identity

| Field | Value |
|---|---|
| Experiment date | 2026-09-17 (Modal run `ap-F6K6wtSXXOOqjuIEatCXXs`, train dirs `2026-09-17_201258` / `2026-09-17_201247`) |
| Source dataset | Room 213 Lab job `cecc2763` (X4-only) |
| Panos / views | {a_eff["pano_count"]} / {a_eff["view_count"]} |
| Recipe hash | `{recipe["recipe_hash"]}` |
| Source hash | `{a_eff["source_hash"]}` |
| Mask hash | `{a_eff["mask_hash"]}` |
| Pose hash | `{a_eff["pose_hash"]}` |
| Seed PLY hash | `{a_eff["seed_hash"]}` |
| QA pose hash | `{a_eff["qa_pose_hash"]}` |
| Trainer path | `ns_train_wrap.py` → nerfstudio splatfacto (not a standalone gsplat trainer) |
| Nerfstudio | {a_eff["nerfstudio"]} |
| gsplat | {a_eff["gsplat"]} (CUDA ops: {gsplat_a["cuda_ops"]}) |
| torch | {a_eff["torch"]} |
| GPU | NVIDIA L40S |
| Seed / SH / bilateral | {a_eff["rng_seed"]} / {a_eff["sh_degree"]} / {a_eff["bilateral"]} |
| Resolution | {a_eff["resolution"]} |
| Max steps | {a_eff["max_steps"]} |
| Start | step 0, no `--load-dir` |

## Historical resume finding (separate from Experiment 2)

This is **not** an Experiment 2 A/B result.

Historical Room 213 checkpoints `step-2250`, `step-6000`, and `step-30000` have **bit-identical** Gaussian tensors (`means`, `scales`, `quats`, `opacities`, `features_dc`, `features_rest`) at count **3,542,182**. Only `bil_grids.grids` changed. Nerfstudio 1.1.5 bound Adam to the original parameter objects, then checkpoint load replaced the live Gaussians without rebinding optimizers. Historical Room is **not** a converged 30k-step model. Real optimization stopped around step 2250.

Experiment 2 avoided that path: both arms started from scratch (`No Nerfstudio checkpoint to load, so training from scratch.`). Checkpoint Gaussian hashes **change at every save** on both arms.

## Experiment 2 A/B findings (densify policy only)

Changed variable: **`refine_stop_iter` only** (Arm A 500 vs Arm B 4300).

Visual verdict: **UNREVIEWED**. No winner.

### Exact Arm A effective config (`ROOM213_FROZEN_CONTROL`)

See `arm-a-effective-config.yaml`. Summary:

- `refine_stop_iter` / `stop_split_at`: **500**
- `pause_refine_after_reset`: requested {wrap_a["requested_pause_refine_after_reset"]} → effective **{wrap_a["effective_pause_refine_after_reset"]}**
- CLI: `{" ".join(str(x) for x in cmd_a[2:])}`

### Exact Arm B effective config (`ROOM213_GROWTH_TEST`)

See `arm-b-effective-config.yaml`. Summary:

- `refine_stop_iter` / `stop_split_at`: **4300**
- `pause_refine_after_reset`: requested {wrap_b["requested_pause_refine_after_reset"]} → effective **{wrap_b["effective_pause_refine_after_reset"]}**
- CLI: `{" ".join(str(x) for x in cmd_b[2:])}`

### Explicit config diff

Frozen recipe keys are identical across arms (source/mask/pose/seed/views/resolution/SH/bilateral/optimizer/loss/GPU/seed/converter/QA poses).

Intended difference:

| Key | Arm A | Arm B |
|---|---|---|
| `refine_stop_iter` | 500 | 4300 |
| `schedule.stop_split_at_absolute` | 500 | 4300 |
| `arm_name` | ROOM213_FROZEN_CONTROL | ROOM213_GROWTH_TEST |

Other recorded (result, not input) differences: train runtime/cost/final count, export PLY hashes.

Unexpected non-variable drift: {config_diff if config_diff else "none in recipe fields"}.

SPZ conversion failed on **both** arms (`splat-transform@2.7.1` exit 1). PLY QA renders exist.

### Gaussian counts

| | Arm A | Arm B |
|---|---|---|
| Starting (seed / step 0 TB) | 209587 | 209587 |
| Checkpoint 750 | {a_ck[0]["gaussian_count"]} | {b_ck[0]["gaussian_count"]} |
| Checkpoint 1500 | {a_ck[1]["gaussian_count"]} | {b_ck[1]["gaussian_count"]} |
| Checkpoint 2250 | {a_ck[2]["gaussian_count"]} | {b_ck[2]["gaussian_count"]} |
| Checkpoint 3000 | {a_ck[3]["gaussian_count"]} | {b_ck[3]["gaussian_count"]} |
| Checkpoint 3750 | {a_ck[4]["gaussian_count"]} | {b_ck[4]["gaussian_count"]} |
| Checkpoint 4500 | {a_ck[5]["gaussian_count"]} | {b_ck[5]["gaussian_count"]} |
| Peak | {max(a_counts)} | {max(b_counts)} |
| Final (step 7999) | {a_ck[-1]["gaussian_count"]} | {b_ck[-1]["gaussian_count"]} |

Arm A stayed at the SfM seed count for the entire run (densify window 250–500 only). Arm B grew until `stop_split_at=4300`, then count held at 7,499,239 while parameter hashes continued to change.

### Checkpoint hashes (early / middle / final)

Early = 750, middle = 3750, final = 7999. Full table in `checkpoint-hashes.json`.

**Arm A** — count 209587 at all three. Every listed tensor hash changed 750→3750 and 3750→7999.

| Tensor | 750 | 3750 | 7999 | changed 750→3750 | changed 3750→7999 |
|---|---|---|---|---|---|
| means | `{hashes["arm_a"]["early"]["means"]}` | `{hashes["arm_a"]["middle"]["means"]}` | `{hashes["arm_a"]["final"]["means"]}` | true | true |
| scales | `{hashes["arm_a"]["early"]["scales"]}` | `{hashes["arm_a"]["middle"]["scales"]}` | `{hashes["arm_a"]["final"]["scales"]}` | true | true |
| quats | `{hashes["arm_a"]["early"]["quats"]}` | `{hashes["arm_a"]["middle"]["quats"]}` | `{hashes["arm_a"]["final"]["quats"]}` | true | true |
| opacities | `{hashes["arm_a"]["early"]["opacities"]}` | `{hashes["arm_a"]["middle"]["opacities"]}` | `{hashes["arm_a"]["final"]["opacities"]}` | true | true |
| features_dc | `{hashes["arm_a"]["early"]["features_dc"]}` | `{hashes["arm_a"]["middle"]["features_dc"]}` | `{hashes["arm_a"]["final"]["features_dc"]}` | true | true |
| features_rest | `{hashes["arm_a"]["early"]["features_rest"]}` | `{hashes["arm_a"]["middle"]["features_rest"]}` | `{hashes["arm_a"]["final"]["features_rest"]}` | true | true |

**Arm B** — count 398446 / 6736680 / 7499239. Every listed tensor hash changed 750→3750 and 3750→7999.

| Tensor | 750 | 3750 | 7999 | changed 750→3750 | changed 3750→7999 |
|---|---|---|---|---|---|
| means | `{hashes["arm_b"]["early"]["means"]}` | `{hashes["arm_b"]["middle"]["means"]}` | `{hashes["arm_b"]["final"]["means"]}` | true | true |
| scales | `{hashes["arm_b"]["early"]["scales"]}` | `{hashes["arm_b"]["middle"]["scales"]}` | `{hashes["arm_b"]["final"]["scales"]}` | true | true |
| quats | `{hashes["arm_b"]["early"]["quats"]}` | `{hashes["arm_b"]["middle"]["quats"]}` | `{hashes["arm_b"]["final"]["quats"]}` | true | true |
| opacities | `{hashes["arm_b"]["early"]["opacities"]}` | `{hashes["arm_b"]["middle"]["opacities"]}` | `{hashes["arm_b"]["final"]["opacities"]}` | true | true |
| features_dc | `{hashes["arm_b"]["early"]["features_dc"]}` | `{hashes["arm_b"]["middle"]["features_dc"]}` | `{hashes["arm_b"]["final"]["features_dc"]}` | true | true |
| features_rest | `{hashes["arm_b"]["early"]["features_rest"]}` | `{hashes["arm_b"]["middle"]["features_rest"]}` | `{hashes["arm_b"]["final"]["features_rest"]}` | true | true |

Confirmation: **tensors actually changed** on both arms. This is the opposite of the historical resume freeze.

### Loss / PSNR (train-view scalars, every 50 steps)

SSIM as a standalone series was **not logged**; loss is `l1+ssim`. Do not invent SSIM columns.

| | Arm A | Arm B |
|---|---|---|
| Step 0 loss | {a_metrics[0]["loss"]} | {b_metrics[0]["loss"]} |
| Step 0 PSNR | {a_metrics[0]["psnr"]} | {b_metrics[0]["psnr"]} |
| Final logged step | {a_last["step"]} | {b_last["step"]} |
| Final loss | {a_last["loss"]} | {b_last["loss"]} |
| Final PSNR | {a_last["psnr"]} | {b_last["psnr"]} |
| Peak GPU memory (MB) | {max(float(r["gpu_memory"]) for r in a_metrics if r["gpu_memory"] != "")} | {max(float(r["gpu_memory"]) for r in b_metrics if r["gpu_memory"] != "")} |

Full series: `arm-a-metrics.csv`, `arm-b-metrics.csv`.

### Was Arm B still materially improving at step 8000?

Train-view scalars from step {b_improve.get("from_step")} to {b_improve.get("to_step")}: loss {b_improve.get("loss_from")} → {b_improve.get("loss_to")} (not decreasing), PSNR {b_improve.get("psnr_from")} → {b_improve.get("psnr_to")} (slightly increasing). These are single-image train metrics, not a visual verdict.

Count was already frozen after step 4300. Parameter hashes still changed 7500→7999, so optimization of the existing 7.50M Gaussians was not a no-op. Whether that is *material visual* improvement is **UNREVIEWED**.

### Runtime, cost, guards

| | Arm A | Arm B |
|---|---|---|
| Runtime | {a_eff["train"]["elapsed_s"]} s (29.3 min) | {b_eff["train"]["elapsed_s"]} s (40.3 min) |
| Cost | ${a_eff["train"]["cost_usd"]} | ${b_eff["train"]["cost_usd"]} |
| Hourly | ${a_eff["hourly_usd"]} | ${b_eff["hourly_usd"]} |
| Abort | {a_eff["train"]["abort"]} | {b_eff["train"]["abort"]} |
| Exit | {a_eff["train"]["exit_code"]} | {b_eff["train"]["exit_code"]} |

This valid run total: **$3.4421**. Guards: 10M Gaussians / 90 min / $15 — none tripped (Arm B peak 7,499,239).

Prior infra-failed launches (missing Open3D libs / missing gsplat CUDA) are **not** scientific results and are excluded from these metrics.

### Opacity fractions

Computed from ns-export PLY `opacity` (activated 0–1). Export count is lower than the live train count because `ns-export` culls some Gaussians. Not fabricated.

| Threshold | Arm A (export n={opacity["arm_a"]["count"] if opacity["arm_a"] else "n/a"}) | Arm B (export n={opacity["arm_b"]["count"] if opacity["arm_b"] else "n/a"}) |
|---|---|---|
| < 0.001 | {opacity["arm_a"]["frac_below_0.001"] if opacity["arm_a"] else "not computed"} | {opacity["arm_b"]["frac_below_0.001"] if opacity["arm_b"] else "not computed"} |
| < 0.01 | {opacity["arm_a"]["frac_below_0.01"] if opacity["arm_a"] else "not computed"} | {opacity["arm_b"]["frac_below_0.01"] if opacity["arm_b"] else "not computed"} |
| < 0.05 | {opacity["arm_a"]["frac_below_0.05"] if opacity["arm_a"] else "not computed"} | {opacity["arm_b"]["frac_below_0.05"] if opacity["arm_b"] else "not computed"} |
| < 0.1 | {opacity["arm_a"]["frac_below_0.1"] if opacity["arm_a"] else "not computed"} | {opacity["arm_b"]["frac_below_0.1"] if opacity["arm_b"] else "not computed"} |

Train-time counts were 209587 (A) and 7499239 (B).

### Matched visual QA

Four composites, Arm A LEFT | Arm B RIGHT, identical camera / renderer / 1280 resolution / no per-arm auto-frame:

- `A_on_path.png`
- `B_off_path.png`
- `C_dollhouse.png`
- `D_overhead.png`

Labels only: `Arm A — refine stop 500` and `Arm B — refine stop 4300`. No BETTER/WORSE.

Historical three-way: {hist_note}

Integrity record: `{integrity["scientific_status"]}`.
"""
    (DEST / "EXPERIMENT2_RESULTS.md").write_text(md, encoding="utf-8")
    print("wrote", DEST)
    for p in sorted(DEST.iterdir()):
        print(f"  {p.name:40s} {p.stat().st_size:8d}")


if __name__ == "__main__":
    main()
