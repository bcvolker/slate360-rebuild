"""Experiment 1: matched PLY vs SPZ renders. No training."""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hashes import sha256_file, sha256_json
from manifest import TERMINAL_OK, build_result_manifest, write_result_manifest
from ply_load import load_ply
from poses import derive_room213_poses, load_poses, write_poses
from render import RENDER_SETTINGS, RENDER_TOOL, cloud_to_tensors, render_pose, save_png, write_summary
from spz_decode import decode_spz

OUT_NAMES = {
    "A_on_path": "A_on_path.png",
    "B_off_path": "B_off_path.png",
    "C_dollhouse": "C_dollhouse.png",
    "D_overhead": "D_overhead.png",
}


def bounds_of(xyz) -> dict:
    import numpy as np

    arr = np.asarray(xyz)
    return {
        "min": arr.min(0).tolist(),
        "max": arr.max(0).tolist(),
        "p01": np.percentile(arr, 1, axis=0).tolist(),
        "p99": np.percentile(arr, 99, axis=0).tolist(),
    }


def render_artifact(
    *,
    label: str,
    cloud,
    poses: list[dict],
    out_dir: Path,
    device: str,
) -> dict:
    tensors = cloud_to_tensors(cloud, device)
    hashes = {}
    for pose in poses:
        png_name = OUT_NAMES[pose["id"]]
        img = render_pose(tensors, pose, device)
        hashes[pose["id"]] = save_png(out_dir / png_name, img)
    return {
        "label": label,
        "count": int(cloud.count),
        "sh_degree": int(cloud.sh_degree),
        "bounds": bounds_of(cloud.positions),
        "render_hashes": hashes,
        "client_visual_verdict": "UNREVIEWED",
    }


def side_by_side(ply_dir: Path, spz_dir: Path, dest: Path) -> dict[str, str]:
    from PIL import Image
    import numpy as np

    dest.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for name in OUT_NAMES.values():
        a = np.asarray(Image.open(ply_dir / name))
        b = np.asarray(Image.open(spz_dir / name))
        gap = np.zeros((a.shape[0], 8, 3), dtype=np.uint8)
        side = np.concatenate([a, gap, b], axis=1)
        path = dest / name
        Image.fromarray(side).save(path)
        hashes[name] = sha256_file(path)
    return hashes


def run_exp1(args: argparse.Namespace) -> dict:
    qa = Path(args.qa_dir)
    qa.mkdir(parents=True, exist_ok=True)
    pose_path = Path(args.poses)
    if args.derive_poses:
        payload = derive_room213_poses(
            Path(args.transforms),
            Path(args.dataparser),
            dataset_id=args.dataset,
        )
        write_poses(pose_path, payload)
    poses_doc = load_poses(pose_path)
    poses = poses_doc["poses"]
    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device != "cuda":
        raise RuntimeError("Experiment 1 requires CUDA for gsplat rasterization")

    t0 = time.time()
    ply_cloud = load_ply(Path(args.ply))
    spz_cloud = decode_spz(Path(args.spz), to_rdf=True)
    ply_dir = qa / "renders" / args.dataset / "ply"
    spz_dir = qa / "renders" / args.dataset / "spz"
    ply_info = render_artifact(label="ply", cloud=ply_cloud, poses=poses, out_dir=ply_dir, device=device)
    spz_info = render_artifact(label="spz", cloud=spz_cloud, poses=poses, out_dir=spz_dir, device=device)
    side_hashes = side_by_side(ply_dir, spz_dir, qa / "renders" / args.dataset / "side")
    # Spec filenames at qa/renders/*.png are the side-by-side pack (PLY | SPZ).
    spec_dir = qa / "renders"
    spec_dir.mkdir(parents=True, exist_ok=True)
    from PIL import Image
    import shutil

    for src_name, dest_name in OUT_NAMES.items():
        shutil.copy2(qa / "renders" / args.dataset / "side" / dest_name, spec_dir / dest_name)

    elapsed = time.time() - t0
    import gsplat

    summary = {
        "experiment": "exp1_ply_vs_spz",
        "dataset": args.dataset,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "artifact_hash": {
            "ply": sha256_file(Path(args.ply)),
            "spz": sha256_file(Path(args.spz)),
        },
        "render_tool": RENDER_TOOL,
        "render_tool_version": getattr(gsplat, "__version__", "unknown"),
        "camera_pose_set_hash": poses_doc.get("pose_set_hash"),
        "renderer_settings": RENDER_SETTINGS,
        "artifact_count": {"ply": ply_info["count"], "spz": spz_info["count"]},
        "bounds": {"ply": ply_info["bounds"], "spz": spz_info["bounds"]},
        "human_verdict": "UNREVIEWED",
        "ARM_A_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "ARM_B_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "ply": ply_info,
        "spz": spz_info,
        "side_by_side_hashes": side_hashes,
        "elapsed_s": round(elapsed, 3),
        "device": device,
        "notes": (
            "Side-by-side PNGs are PLY (left) | SPZ (right). "
            "Verdicts stay UNREVIEWED until Brian reviews matched views. "
            "Do not treat PSNR or splat count as success."
        ),
    }
    write_summary(qa / "visual-summary.json", summary)
    (qa / f"visual-summary.{args.dataset}.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    hashes = {
        "ply": summary["artifact_hash"]["ply"],
        "spz": summary["artifact_hash"]["spz"],
        **side_hashes,
    }
    effective = sha256_json({
        "render_tool": summary["render_tool"],
        "render_tool_version": summary["render_tool_version"],
        "renderer_settings": summary["renderer_settings"],
        "camera_pose_set_hash": summary["camera_pose_set_hash"],
    })
    write_result_manifest(
        qa / "result-manifest.json",
        build_result_manifest(
            experiment_id="exp1_ply_vs_spz",
            arm=None,
            hashes=hashes,
            effective_config_hash=effective,
            status=TERMINAL_OK,
            extra={
                "dataset": args.dataset,
                "artifact_count": summary["artifact_count"],
                "elapsed_s": summary["elapsed_s"],
                "device": device,
            },
        ),
    )
    return summary


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Experiment 1: PLY vs SPZ matched renders")
    p.add_argument("--ply", required=True)
    p.add_argument("--spz", required=True)
    p.add_argument("--poses", required=True)
    p.add_argument("--qa-dir", required=True)
    p.add_argument("--dataset", default="room213")
    p.add_argument("--derive-poses", action="store_true")
    p.add_argument("--transforms")
    p.add_argument("--dataparser")
    return p


if __name__ == "__main__":
    args = build_parser().parse_args()
    print(json.dumps(run_exp1(args), indent=2))
