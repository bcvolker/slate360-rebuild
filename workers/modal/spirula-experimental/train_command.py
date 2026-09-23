"""The only Spirula invocation this worker is allowed to build."""

from __future__ import annotations

from pin import SPIRULA_BIN

# Milestone 1 never turns these on. The 360 preset warps fisheye to pinhole.
LOCKED_OFF = {
    "warp_to_pinhole": False,
    "load_depths": False,
    "load_normals": False,
    "disable_viewer": True,
    "keep_viewer_alive": False,
    "save_full_checkpoint": True,
}


def smoke_overrides() -> dict:
    return {
        "num_iterations": 6,
        "cap_max": 2000,
        "steps_per_save": 2,
        "save_eval_images": False,
        "data_format": "colmap",
    }


def argv(data_dir: str, output_name: str, resume: str | None, extra: dict) -> list[str]:
    flags = {**LOCKED_OFF, **extra}
    if flags.get("warp_to_pinhole"):
        raise RuntimeError("warp_to_pinhole is locked off")
    if int(flags.get("cap_max", 0)) > 2000 and extra.get("profile") != "approved-train":
        raise RuntimeError("cap_max above the smoke ceiling is not launchable")
    cmd = [
        SPIRULA_BIN,
        "train",
        "--data",
        data_dir,
        "--data-format",
        "colmap",
        "--output-dir-name",
        output_name,
        "--disable-viewer",
        "true",
        "--keep-viewer-alive",
        "false",
        "--save-full-checkpoint",
        "true",
        "--load-depths",
        "false",
        "--load-normals",
        "false",
        "--warp-to-pinhole",
        "false",
        "--num-iterations",
        str(int(flags["num_iterations"])),
        "--cap-max",
        str(int(flags["cap_max"])),
        "--steps-per-save",
        str(int(flags["steps_per_save"])),
    ]
    if resume:
        cmd.extend(["--resume", resume])
    return cmd


def room213_command(data_dir: str) -> list[str]:
    """Documented only. The worker refuses to spawn this."""
    return [
        SPIRULA_BIN,
        "train",
        "--data",
        data_dir,
        "--data-format",
        "colmap",
        "--output-dir-name",
        "room213-spirula-1m",
        "--disable-viewer",
        "true",
        "--keep-viewer-alive",
        "false",
        "--save-full-checkpoint",
        "true",
        "--load-depths",
        "false",
        "--load-normals",
        "false",
        "--warp-to-pinhole",
        "false",
        "--num-iterations",
        "30000",
        "--cap-max",
        "1000000",
        "--steps-per-save",
        "2000",
    ]
