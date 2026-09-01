"""ns-train argv. Camera optimizer is always stated as off. Bilateral grid is the only A/B."""
from __future__ import annotations

from pathlib import Path

CAM_OPT = "--pipeline.model.camera-optimizer.mode"


def build_train_args(
    data_dir: Path,
    output_dir: Path,
    *,
    bilateral_grid: bool,
    iterations: int,
    scene_scale: float,
    experiment: str,
) -> list[str]:
    args = [
        "ns-train",
        "splatfacto",
        "--data",
        str(data_dir),
        "--output-dir",
        str(output_dir),
        "--experiment-name",
        experiment,
        "--max-num-iterations",
        str(int(iterations)),
        "--vis",
        "tensorboard",
        "--viewer.quit-on-train-completion",
        "True",
        CAM_OPT,
        "off",
        "--pipeline.model.rasterize-mode",
        "classic",
        "nerfstudio-data",
        "--data",
        str(data_dir),
        "--orientation-method",
        "none",
        "--center-method",
        "none",
        "--auto-scale-poses",
        "False",
        "--scene-scale",
        str(float(scene_scale)),
        "--load-3D-points",
        "True",
        "--downscale-factor",
        "1",
    ]
    if bilateral_grid:
        # Insert before the dataparser token so tyro binds it to the method.
        idx = args.index("nerfstudio-data")
        args[idx:idx] = ["--pipeline.model.use-bilateral-grid", "True"]
    if CAM_OPT not in args or args[args.index(CAM_OPT) + 1] != "off":
        raise AssertionError("camera optimizer must be explicitly off")
    if "--pipeline.model.rasterize-mode" in args:
        mode = args[args.index("--pipeline.model.rasterize-mode") + 1]
        if mode != "classic":
            raise AssertionError("antialiased rasterize is not this experiment")
    return args


def camera_optimizer_is_off(args: list[str]) -> bool:
    return CAM_OPT in args and args[args.index(CAM_OPT) + 1] == "off"


def bilateral_grid_enabled(args: list[str]) -> bool:
    flag = "--pipeline.model.use-bilateral-grid"
    return flag in args and args[args.index(flag) + 1] == "True"
