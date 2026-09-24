# Hardened experimental Spirula worker

Isolated Modal app `slate360-spirula-hardened`. It does not deploy or import `slate360-twin-gaussian-splat` or the
earlier `slate360-spirula-experimental` app, has no web endpoint and no production callback. Results:
`docs/ops/SPIRULA_WORKER_HARDENING_RESULT.md`.

## Pin (the golden Room 213 build, not the earlier e6d38a2a pin)

- Spirula `fd1afca1c47f89c98c8e64929f1c73b82571e5f3`, CUDA backend, sm_89.
- The image carries the exact golden binary, sha256 `24cf3ca8…5dc5a3`, verified at deploy (the local file is hashed)
  and on every attempt (`_hardware()` hashes `/opt/spirula/bin/spirula`).
- Base `nvidia/cuda:12.8.1-devel-ubuntu22.04`, Python 3.11. GPU `L40S`.

## Deploy

```bash
cd workers/modal/spirula-experimental
SPIRULA_GOLDEN_BINARY=/path/to/golden/spirula PYTHONIOENCODING=utf-8 python -m modal deploy worker.py
```

## Functions

| function | hw | purpose |
|---|---|---|
| `selftest` | CPU | the full probe suite (`test_hardening.py`) on Linux |
| `package_golden` | CPU | immutable golden Room 213 package in R2, read-only on the benchmark volume |
| `package_fixture` / `put_job` / `config_probe` | CPU / CPU / GPU | the small real-Spirula fixture for the resume proof |
| `lock_probe` | CPU | lease acquisition (duplicate-launch evidence) |
| `train_attempt` | L40S | one attempt of a logical run; `max_containers=1`, `retries=0`, 4 h timeout |

## Modules

- `jobspec.py` — immutable job manifest -> exact train-only command; unknown fields/flags rejected; locked flags.
- `dspackage.py` — content-addressed dataset manifests; the fixture builder.
- `gate.py` — THE completion gate (all exit paths); `state.txt` never accepted; only the known on_exit SIGSEGV.
- `inventory.py` — pre-upload inventory, then fresh R2 read against it.
- `runlock.py` — run / attempt / owner lease on R2 conditional writes; takeover only when the old call is finished.
- `cost_guard.py` — $5 / 240 min caps incl. prior attempts; cumulative ledger; `AUTOMATIC_RETRIES = 0`.
- `train_run.py` — runtime limit independent of stdout; process-group stop.
- `attempt.py` — prepare / train / finish; durable periodic checkpoints; resume from R2 on a fresh worker.

R2 root: `experimental/spirula-hardened/`.
