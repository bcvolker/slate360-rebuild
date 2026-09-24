"""Pinned Spirula build = the exact binary that produced the golden Room 213 run (ROOM213_SPIRULA_1M_MANIFEST.json).

The golden run used commit fd1afca1 (CUDA backend, sm_89, CUDA 12.8.1 devel). The earlier experimental pin
e6d38a2a is NOT used: the golden manifest is the source of truth and the recipe may not change."""

SPIRULA_REPO = "https://github.com/harry7557558/spirula-studio.git"
SPIRULA_SHA = "fd1afca1c47f89c98c8e64929f1c73b82571e5f3"
BINARY_SHA256 = "24cf3ca8bcde6ce3b6491a44abe7d15fd24b329874f6fa4f8b823863854dc5a3"
SPIRULA_BIN = "/opt/spirula/bin/spirula"
SPIRULA_SHA_FILE = "/opt/spirula/PINNED_SHA"
CUDA_BASE_IMAGE = "nvidia/cuda:12.8.1-devel-ubuntu22.04"
GPU = "L40S"
R2_ROOT = "experimental/spirula-hardened"

# Upstream defect at this pin (verified 2026-09-23, fixture-resume-v1/v2): checkpoints store num_sh = 15 (SH rest
# coefficients) but TrainerSession::restore_checkpoint targets (sh_degree+1)^2 = 16, so EVERY resume takes the host
# "adapt" path, resamples SH 15 -> 16 and exports a non-standard PLY (f_rest_0..47). The strict gate rejects it.
# Resume stays disabled (fail closed, before any GPU training) until a pin without this defect is validated.
RESUME_SUPPORTED = False
