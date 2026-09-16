"""ns-train wrapper: skip pin_memory copies and clamp densify pause.

Nerfstudio's FullImageDatamanager calls tensor.pin_memory() after caching
every training image. That duplicates the cache. 7712×1280 uint8 is already
~35 GB; the pin copy SIGKILLs WSL at 64 GB (job 91b7d4bd, exit -9).

Splatfacto also sets gsplat DefaultStrategy.pause_refine_after_reset to
num_train_images + refine_every. Densify only runs when
`step % reset_every >= pause`. reset_every is 3000, so any job with more
than ~2900 views (backyard is 7712) never splits. TensorBoard on both
backyard trains stayed at 383,657 gaussians for every logged step.
"""
from __future__ import annotations

import sys

import torch

_PAUSE_CAP = 250

_ORIG_PIN = torch.Tensor.pin_memory
_SKIP_BYTES = 256 * 1024


def _pin_memory(self, *args, **kwargs):  # noqa: ANN001
    if self.numel() * self.element_size() >= _SKIP_BYTES:
        return self
    return _ORIG_PIN(self, *args, **kwargs)


torch.Tensor.pin_memory = _pin_memory  # type: ignore[method-assign]


def _clamp_densify_pause() -> None:
    from gsplat.strategy.default import DefaultStrategy

    orig = DefaultStrategy.__init__

    def wrapped(self, *args, **kwargs):  # noqa: ANN001
        pause = kwargs.get("pause_refine_after_reset")
        if isinstance(pause, (int, float)) and pause > _PAUSE_CAP:
            kwargs["pause_refine_after_reset"] = _PAUSE_CAP
        return orig(self, *args, **kwargs)

    DefaultStrategy.__init__ = wrapped  # type: ignore[method-assign]


_clamp_densify_pause()

from nerfstudio.scripts.train import entrypoint  # noqa: E402

if __name__ == "__main__":
    sys.argv[0] = "ns-train"
    entrypoint()
