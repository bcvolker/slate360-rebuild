"""Pinned Spirula revision. The image build must match this string."""

SPIRULA_REPO = "https://github.com/harry7557558/spirula-studio.git"
SPIRULA_SHA = "e6d38a2a900bb1eddc73c68051cc625e88809c5f"
SPIRULA_BIN = "/opt/spirula/bin/spirula"
SPIRULA_SHA_FILE = "/opt/spirula/PINNED_SHA"

# CUDA devel image. Vulkan is not installed: milestone 1 is train-only.
CUDA_BASE_IMAGE = "nvidia/cuda:12.4.1-devel-ubuntu22.04"
IMAGE_APT = (
    "git",
    "cmake",
    "ninja-build",
    "build-essential",
    "python3",
    "ca-certificates",
    "pkg-config",
    "libomp-dev",
)
