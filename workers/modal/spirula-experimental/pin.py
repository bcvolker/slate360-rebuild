"""Pinned Spirula build = the exact binary that produced the golden Room 213 run (ROOM213_SPIRULA_1M_MANIFEST.json).

The golden run used commit fd1afca1 (CUDA backend, sm_89, CUDA 12.8.1 devel). The earlier experimental pin
e6d38a2a is NOT used: the golden manifest is the source of truth and the recipe may not change."""

SPIRULA_REPO = "https://github.com/harry7557558/spirula-studio.git"
SPIRULA_SHA = "fd1afca1c47f89c98c8e64929f1c73b82571e5f3"
GOLDEN_BINARY_SHA256 = "24cf3ca8bcde6ce3b6491a44abe7d15fd24b329874f6fa4f8b823863854dc5a3"   # golden run, unpatched
# The worker runs upstream fd1afca1 + ONE line (resume SH-coefficient target, see RESUME note below), built with the
# golden image/cmake/flags. It is recorded as a patched build everywhere, never as unchanged upstream.
SPIRULA_PATCH_SHA256 = "2f6a873bb639ee736e6c02a60def261e32717e957e134fea6e8066addb3f7331"
BINARY_SHA256 = "dce42548527bbacf266bb3c4f9447afa5681d8d6179c7d2c9f149b67d77bd8aa"
SPIRULA_BIN = "/opt/spirula/bin/spirula"
SPIRULA_SHA_FILE = "/opt/spirula/PINNED_SHA"
CUDA_BASE_IMAGE = "nvidia/cuda:12.8.1-devel-ubuntu22.04"
GPU = "L40S"
R2_ROOT = "experimental/spirula-hardened"
SPIRULA_BUILD_ID = f"{SPIRULA_SHA}+resume-nsh-{SPIRULA_PATCH_SHA256[:12]}"
BINARY_R2_KEY = f"{R2_ROOT}/tools/spirula/{SPIRULA_BUILD_ID}/spirula"

# Upstream defect at the unpatched pin (verified 2026-09-23, fixture-resume-v1/v2): checkpoints store num_sh = 15 (SH rest
# coefficients) but TrainerSession::restore_checkpoint targets (sh_degree+1)^2 = 16, so EVERY resume takes the host
# "adapt" path, resamples SH 15 -> 16 and exports a non-standard PLY (f_rest_0..47). The strict gate rejects it.
# The patch makes the resume target (d+1)^2 - 1, matching fresh init and the checkpoint writer. Resume is enabled
# only with the patched build; the gate additionally rejects any "layout differs" adapt and requires the restored
# world arrays to be byte-identical to the durable checkpoint.
RESUME_SUPPORTED = True
