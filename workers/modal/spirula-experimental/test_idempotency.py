"""Idempotency, cost ledger, and SIGSEGV acceptance. No GPU."""

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from acceptance import AcceptRejected, accept_attempt, dataset_signature
from claims import MemoryLocks, callback_effect, claim_experiment
from cost_guard import CostRejected, account_attempts, assert_allowed
from package_validate import sha256_file
from synthetic_dataset import build
from test_spirula_experimental import _ply


def _remote(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256_file(path)
        for path in root.rglob("*")
        if path.is_file()
    }


def _tree(root: Path, terminal: int = 6) -> str:
    data = build(root / "dataset", experiment_id="exp-1")
    command = "spirula train --data /data --num-iterations 6 --resume /out"
    attempt = {
        "experimentId": "exp-1",
        "configSha256": hashlib.sha256(command.encode("utf-8")).hexdigest(),
        "datasetSha256": dataset_signature(data),
        "terminalStep": terminal,
    }
    (root / "attempt.json").write_text(json.dumps(attempt), encoding="utf-8")
    (root / "validation.json").write_text(json.dumps({"experimentId": "exp-1"}), encoding="utf-8")
    (root / "logs").mkdir()
    (root / "logs" / "resume.log").write_text(
        f"command: {command}\n"
        "Resumed from /out/step-000000004.ckpt at step 4\n"
        f"step      {terminal}/{terminal} (100%)  splats 1\n"
        "Training complete. Steps: 2\n"
        "=== Spirula Studio crash report ===\n"
        "cause:   SIGSEGV at 0x0\n"
        "#5 libc.so.6+0x45610  on_exit\n",
        encoding="utf-8",
    )
    ckpt = root / "outputs" / "smoke" / f"step-{terminal:09d}.ckpt"
    ckpt.mkdir(parents=True)
    (ckpt / "state.txt").write_text("state", encoding="utf-8")
    _ply(root / "outputs" / "smoke" / "splat.ply", (0, 0, 5))
    return command


class Idempotency(unittest.TestCase):
    def test_duplicate_and_simultaneous_claims(self):
        locks = MemoryLocks()
        first = claim_experiment(locks.try_lock, locks.release, "exp-1")
        second = claim_experiment(locks.try_lock, locks.release, "exp-1")
        self.assertTrue(first["spawn"])
        self.assertFalse(second["spawn"])
        other = MemoryLocks()
        other.held = locks.held
        raced = claim_experiment(other.try_lock, other.release, "exp-2")
        self.assertFalse(raced["spawn"])
        self.assertEqual(raced["reason"], "gpu busy")

    def test_stale_lock_and_preemption_do_not_spawn(self):
        locks = MemoryLocks()
        locks.try_lock("experimental/spirula/ACTIVE_GPU", b"old")
        stale = claim_experiment(locks.try_lock, locks.release, "exp-1")
        self.assertFalse(stale["spawn"])
        self.assertNotIn("experimental/spirula/exp-1/STARTED", locks.held)
        locks.release("experimental/spirula/ACTIVE_GPU")
        claim_experiment(locks.try_lock, locks.release, "exp-1")
        locks.release("experimental/spirula/ACTIVE_GPU")
        again = claim_experiment(locks.try_lock, locks.release, "exp-1")
        self.assertFalse(again["spawn"])
        self.assertEqual(again["reason"], "experiment already started")

    def test_callback_retry_never_retrains(self):
        for status in ("completed", "failed", "cancelled", "training", None):
            effect = callback_effect(status)
            self.assertFalse(effect["spawn"])
        self.assertTrue(callback_effect("completed")["idempotent"])
        locks = MemoryLocks()
        claim_experiment(locks.try_lock, locks.release, "exp-1")
        locks.release("experimental/spirula/ACTIVE_GPU")
        self.assertFalse(callback_effect("failed")["spawn"])
        retry = claim_experiment(locks.try_lock, locks.release, "exp-1")
        self.assertFalse(retry["spawn"])

    def test_cost_ledger_includes_failed_and_resume(self):
        with self.assertRaises(CostRejected):
            assert_allowed("T4", 241, None)
        ledger = account_attempts(
            [
                {"seconds": 13.3, "usdPerHour": 0.59, "trainers": 1},
                {"seconds": 15.5, "usdPerHour": 0.59, "trainers": 1},
            ]
        )
        self.assertEqual(ledger["trainers"], 1)
        self.assertEqual(ledger["attempts"], 2)
        self.assertEqual(ledger["actualSeconds"], 28.8)
        with self.assertRaises(CostRejected):
            account_attempts([{"seconds": 1, "usdPerHour": 0.59, "trainers": 2}])

    def test_sigsegv_accepted_only_from_matching_storage(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _tree(root)
            remote = _remote(root)
            decision = accept_attempt(root, -11, remote)
            self.assertEqual(decision["exitCode"], -11)
            self.assertIn("SIGSEGV", decision["crash"])
            self.assertEqual(decision["terminalStep"], 6)
            remote["outputs/smoke/splat.ply"] = "0" * 64
            with self.assertRaises(AcceptRejected):
                accept_attempt(root, -11, remote)
            remote = _remote(root)
            attempt = json.loads((root / "attempt.json").read_text(encoding="utf-8"))
            attempt["terminalStep"] = 4
            (root / "attempt.json").write_text(json.dumps(attempt), encoding="utf-8")
            remote = _remote(root)
            with self.assertRaises(AcceptRejected):
                accept_attempt(root, -11, remote)
            with self.assertRaises(AcceptRejected):
                accept_attempt(root, -11, {})


if __name__ == "__main__":
    unittest.main()
