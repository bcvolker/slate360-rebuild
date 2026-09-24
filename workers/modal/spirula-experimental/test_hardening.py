"""Hardening probes (Astra blocker list). Pure-logic probes run anywhere; process probes (real subprocess, process
groups, signals) need POSIX and run in the Modal CPU image via `selftest`."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path

import numpy as np

from cost_guard import AUTOMATIC_RETRIES, CostRejected, Ledger, assert_allowed
from gate import (GateRejected, check_ply, exit_acceptable, final_acceptance, parse_state_tar, resume_continuity,
                  terminal_evidence)
from ids import BadId, attempt_id, check_id
from inventory import InventoryRejected, build_inventory, upload_inventory, verify_remote
from jobspec import JobRejected, load_job, materialize, verify_fidelity
from runlock import LockRefused, MemoryStore, RunLock, callback_effect
from testkit import ABRT, CONFIG, SEGV, FakeS3, good_log, make_run, ply_bytes, sha, state_tar_bytes

POSIX = os.name == "posix"


class Tmp(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory(); self.w = Path(self._t.name)

    def tearDown(self):
        self._t.cleanup()

    def accept(self, r, s3=None, log=None, code=0, attempt=None, extra=None):
        return final_acceptance(s3=s3 or FakeS3(), bucket="b", prefix="p", run_dir=r["run"], work=self.w,
                                job=r["job"], attempt=attempt or r["attempt"], exit_code=code,
                                log_text=log if log is not None else good_log(),
                                extra_files=extra if extra is not None else [("train.log", "train-log", None)])


class PlyProbes(Tmp):
    def _ply(self, **kw):
        p = self.w / "s.ply"; p.write_bytes(ply_bytes(**kw)); return p

    def test_good(self):
        self.assertEqual(check_ply(self._ply(), 3, 1, 1000)["gaussianCount"], 64)

    def test_nan_opacity(self):
        self.assertRaisesRegex(GateRejected, "opacity", check_ply, self._ply(poison={"opacity": np.nan}), 3, 1, 1000)

    def test_nan_rotation(self):
        self.assertRaisesRegex(GateRejected, "rot_2", check_ply, self._ply(poison={"rot_2": np.nan}), 3, 1, 1000)

    def test_nan_sh(self):
        self.assertRaisesRegex(GateRejected, "f_rest_44", check_ply, self._ply(poison={"f_rest_44": np.inf}), 3, 1, 1000)
        self.assertRaisesRegex(GateRejected, "f_dc_1", check_ply, self._ply(poison={"f_dc_1": np.nan}), 3, 1, 1000)

    def test_malformed_scale(self):
        self.assertRaisesRegex(GateRejected, "float32", check_ply, self._ply(dtype="double"), 3, 1, 1000)
        self.assertRaisesRegex(GateRejected, "scale_0", check_ply, self._ply(poison={"scale_0": -np.inf}), 3, 1, 1000)
        self.assertRaisesRegex(GateRejected, "body length", check_ply, self._ply(drop_bytes=4), 3, 1, 1000)

    def test_zero_quaternion_and_count(self):
        self.assertRaisesRegex(GateRejected, "zero-length", check_ply,
                               self._ply(poison={"rot_0": 0.0, "rot_1": 0.0, "rot_2": 0.0, "rot_3": 0.0}), 3, 1, 1000)
        self.assertRaises(GateRejected, check_ply, self._ply(), 3, 100, 1000)
        self.assertRaises(GateRejected, check_ply, self._ply(sh=2), 3, 1, 1000)


class StateProbes(Tmp):
    def test_empty_and_invalid_state_tar(self):
        p = self.w / "state.tar"; p.write_bytes(b"")
        self.assertRaisesRegex(GateRejected, "missing or empty", parse_state_tar, p)
        p.write_bytes(b"\0" * 4096)
        self.assertRaises(GateRejected, parse_state_tar, p)
        p.write_bytes(state_tar_bytes(100, full_resume=0))
        self.assertRaisesRegex(GateRejected, "full", parse_state_tar, p)

    def test_fake_state_txt_rejected(self):
        r = make_run(self.w, state_txt=True)
        self.assertRaisesRegex(GateRejected, "state.txt", self.accept, r)

    def test_state_txt_only_rejected(self):
        r = make_run(self.w); (r["run"] / "step-000000100.ckpt" / "state.tar").unlink()
        (r["run"] / "step-000000100.ckpt" / "state.txt").write_text("step 100")
        self.assertRaises(GateRejected, self.accept, r)


class GateProbes(Tmp):
    def test_happy_path_and_fresh_read(self):
        s3 = FakeS3(); d = self.accept(make_run(self.w), s3=s3)
        self.assertTrue(d["accepted"]); self.assertEqual(d["inventory"]["source"], "fresh-r2-read")
        self.assertIn("p/inventory.json", s3.d)

    def test_known_segv_accepted_only_with_chain(self):
        d = self.accept(make_run(self.w), log=good_log() + SEGV, code=-11)
        self.assertEqual(d["exitCode"], -11); self.assertIn("SIGSEGV", d["crash"])

    def test_segv_without_chain_rejected(self):
        r = make_run(self.w, ply=ply_bytes(poison={"opacity": np.nan}))
        self.assertRaises(GateRejected, self.accept, r, log=good_log() + SEGV, code=-11)

    def test_segv_mid_training_rejected(self):
        log = "step  50/100\n" + SEGV
        self.assertRaises(GateRejected, self.accept, make_run(self.w), log=log, code=-11)

    def test_segv_wrong_stack_rejected(self):
        self.assertRaisesRegex(GateRejected, "on_exit", exit_acceptable, -11, SEGV.replace("on_exit", "cudaFree"))

    def test_unrelated_sigabrt(self):
        self.assertRaises(GateRejected, self.accept, make_run(self.w), log=good_log() + ABRT, code=-6)
        self.assertRaises(GateRejected, exit_acceptable, -11, good_log() + ABRT)

    def test_arbitrary_nonzero_and_exit7(self):
        for code in (1, 7, 134, -9, 255):
            self.assertRaisesRegex(GateRejected, "not the known", exit_acceptable, code, good_log())
        self.assertRaises(GateRejected, self.accept, make_run(self.w), code=7)

    def test_exit0_with_crash_rejected(self):
        self.assertRaises(GateRejected, exit_acceptable, 0, good_log() + SEGV)

    def test_changed_resolved_config(self):
        r = make_run(self.w, config={**CONFIG, "cap_max": 65})
        self.assertRaisesRegex(GateRejected, "resolved config", self.accept, r)

    def test_volatile_config_keys_ignored(self):
        self.assertTrue(self.accept(make_run(self.w, config={**CONFIG, "data": "/elsewhere"}))["accepted"])

    def test_wrong_attempt_id(self):
        r = make_run(self.w)
        self.assertRaisesRegex(GateRejected, "attempt id", self.accept, r,
                               attempt={**r["attempt"], "attemptId": "fixture-run-a02"})
        self.assertRaises(BadId, self.accept, r, attempt={**r["attempt"], "attemptId": "../a01"})

    def test_mismatched_dataset_job_binary_gpu(self):
        r = make_run(self.w)
        for k, v in (("datasetSha256", "x"), ("jobManifestSha256", "x"), ("binarySha256", "x"), ("backend", "cpu"),
                     ("gpuName", "NVIDIA A10G")):
            self.assertRaises(GateRejected, self.accept, r, attempt={**r["attempt"], k: v})

    def test_terminal_evidence_required(self):
        r = make_run(self.w)
        self.assertRaises(GateRejected, self.accept, r, log=good_log().replace("step  100/100", "step  99/100"))
        self.assertRaises(GateRejected, self.accept, r, log=good_log().replace("Eval metrics written", "x"))
        self.assertRaises(GateRejected, terminal_evidence, "step  100/100\nTraining complete.\n", 100, False)

    def test_checkpoint_step_and_later(self):
        self.assertRaisesRegex(GateRejected, "holds step 90", self.accept,
                               make_run(self.w, state=state_tar_bytes(90)))

    def test_checkpoint_beyond_terminal(self):
        self.assertRaisesRegex(GateRejected, "beyond", self.accept, make_run(self.w, later=True))

    def test_count_vs_state(self):
        self.assertRaises(GateRejected, self.accept, make_run(self.w, state=state_tar_bytes(100, n=500)))

    def test_changed_terminal_ply_after_upload(self):
        s3 = FakeS3(); s3.tamper["splat.ply"] = ply_bytes(n=63)
        self.assertRaisesRegex(InventoryRejected, "fresh storage read", self.accept, make_run(self.w), s3=s3)

    def test_incomplete_inventory(self):
        r = make_run(self.w)
        self.assertRaisesRegex(InventoryRejected, "train-log", self.accept, r, extra=[])
        s3 = FakeS3(); s3.drop_uploads.add("train.log")
        self.assertRaises(Exception, self.accept, make_run(Path(tempfile.mkdtemp())), s3=s3)

    def test_stale_artifact_reuse(self):
        # A previous attempt's bytes already sit at the destination and this attempt's upload silently fails:
        # the fresh read is checked against THIS attempt's pre-upload inventory, so it is rejected.
        s3 = FakeS3(); s3.d["p/run/step-000000100.ckpt/splat.ply"] = ply_bytes(n=60); s3.etags[
            "p/run/step-000000100.ckpt/splat.ply"] = '"old"'
        s3.drop_uploads.add("splat.ply")
        self.assertRaises(InventoryRejected, self.accept, make_run(self.w), s3=s3)

    def test_stale_run_dir_without_this_attempts_log(self):
        # Valid terminal artifacts left on disk but this attempt's trainer never reached T.
        self.assertRaises(GateRejected, self.accept, make_run(self.w), log="step  10/100\n", code=0)

    def test_resume_continuity(self):
        r = make_run(self.w); att = {**r["attempt"], "resumeFromStep": 50}
        for d in (self.w / "resume_src" / "step-000000050.ckpt", r["run"] / "step-000000050.ckpt"):
            d.mkdir(parents=True); (d / "state.tar").write_bytes(state_tar_bytes(50))
        self.assertTrue(self.accept(r, attempt=att, log=good_log(resumed_at=50))["evidence"]["restoredState"])
        self.assertRaises(GateRejected, self.accept, r, attempt={**att, "resumeFromStep": 40},
                          log=good_log(resumed_at=50))
        self.assertRaises(GateRejected, resume_continuity, "Resumed from x at step 50\nstep  1/100\n")
        self.assertRaises(GateRejected, self.accept, r, attempt=att, log=good_log())


class RestoreProbes(Tmp):
    def test_restored_state(self):
        from gate import restored_state_check
        a = self.w / "a.tar"; b = self.w / "b.tar"; a.write_bytes(state_tar_bytes(50)); b.write_bytes(state_tar_bytes(50))
        self.assertTrue(restored_state_check(a, b)["worldIdentical"])
        b.write_bytes(state_tar_bytes(50, n=65))
        self.assertRaises(GateRejected, restored_state_check, a, b)
        self.assertRaises(GateRejected, restored_state_check, a, self.w / "missing.tar")

    def test_adapt_line_rejected(self):
        r = make_run(self.w); att = {**r["attempt"], "resumeFromStep": 50}
        log = good_log(resumed_at=50).replace("Resumed from", "Checkpoint layout differs from this run's" + chr(10) + "Resumed from")
        self.assertRaisesRegex(GateRejected, "adapted", self.accept, r, attempt=att, log=log)


class DatasetProbes(Tmp):
    def _pkg(self):
        from dspackage import build_fixture, dataset_manifest, put_json, upload_objects
        from jobspec import canonical_sha
        root = self.w / "src"; build_fixture(root)
        man = dataset_manifest(root, dataset_id="fx", lens_folders={"camera1": 1, "camera2": 2},
                               lens_of_camera={"1": "a", "2": "b"}, split_rule="filename", role_of={})
        s3 = FakeS3(); upload_objects(s3, "b", "o", root, man["files"])
        msha = put_json(s3, "b", "m.json", man)
        job = {"dataset": {"manifestKey": "m.json", "manifestSha256": msha, "datasetSha256": canonical_sha(man["files"]),
                           "objectsPrefix": "o"}}
        return s3, job, man

    def test_fidelity_exhaustive(self):
        s3, job, man = self._pkg(); dest = self.w / "d"
        rep = verify_fidelity(dest, materialize(s3, "b", job, dest))
        self.assertEqual(rep["images"], 12); self.assertEqual(rep["cameras"], 2)

    def test_changed_dataset_manifest(self):
        s3, job, man = self._pkg(); man["images"][0]["t"][0] += 1e-9
        s3.d["m.json"] = json.dumps(man, indent=1, sort_keys=True).encode()
        self.assertRaisesRegex(JobRejected, "manifest bytes", materialize, s3, "b", job, self.w / "d")

    def test_changed_object_and_pose_and_lens(self):
        s3, job, man = self._pkg(); dest = self.w / "d"
        k = next(k for k in s3.d if k.startswith("o/")); orig = s3.d[k]; s3.d[k] = orig + b"x"
        self.assertRaises(JobRejected, materialize, s3, "b", job, dest); s3.d[k] = orig
        materialize(s3, "b", job, dest)
        for mut in (lambda m: m["images"][0].__setitem__("cameraId", 2), lambda m: m["images"][1].__setitem__("split", "eval"),
                    lambda m: m["cameras"][0]["params"].__setitem__(4, 0.0201), lambda m: m.__setitem__("sceneTransform", "x"),
                    lambda m: m["lensOfCamera"].__setitem__("1", "b")):
            m2 = json.loads(json.dumps(man)); mut(m2)
            self.assertRaises(JobRejected, verify_fidelity, dest, m2)
        (dest / "extra.png").write_bytes(b"x")
        self.assertRaisesRegex(JobRejected, "tree differs", verify_fidelity, dest, man)


class JobProbes(unittest.TestCase):
    BASE = {"schema": "spirula-job-v1", "runId": "fixture-run", "spirulaSha": "s", "binarySha256": "b",
            "backend": "cuda", "gpu": "L40S", "preset": "3dgs", "expectedResolvedConfigSha256": "c",
            "dataset": {"manifestKey": "k", "manifestSha256": "m", "datasetSha256": "d", "objectsPrefix": "o"},
            "terminalStep": 100, "shDegree": 3, "countMin": 1, "countMax": 9, "evalExpected": True,
            "expectedMinutes": 1, "requiredArtifactTypes": [],
            "flags": [["--warp-to-pinhole", "0"], ["--load-depths", "0"], ["--load-normals", "0"], ["--use-ppisp", "0"],
                      ["--use-bilateral-grid", "0"], ["--use-bilateral-grid-for-geometry", "0"],
                      ["--save-full-checkpoint", "1"], ["--disable-viewer", "1"], ["--data-format", "colmap"],
                      ["--cap-max", "1000000"]]}

    def load(self, job):
        raw = json.dumps(job).encode(); return load_job(raw, sha(raw))

    def test_ok_and_hash(self):
        raw = json.dumps(self.BASE).encode()
        self.assertEqual(self.load(self.BASE)["jobManifestSha256"], sha(raw))
        self.assertRaises(JobRejected, load_job, raw, "0" * 64)

    def test_unknown_missing_field_and_flags(self):
        self.assertRaises(JobRejected, self.load, {**self.BASE, "shDegre": 3})
        self.assertRaises(JobRejected, self.load, {k: v for k, v in self.BASE.items() if k != "shDegree"})
        for bad in (["--sh-degree", "2"], ["--use-ppisp", "1"], ["--cap-max", "5"]):
            self.assertRaises(JobRejected, self.load, {**self.BASE, "flags": self.BASE["flags"] + [bad]})
        self.assertRaises(JobRejected, self.load, {**self.BASE, "flags": self.BASE["flags"][1:]})


class IdLockCostProbes(unittest.TestCase):
    def test_ids(self):
        for bad in (".", "..", "a/b", "a b", "a\tb", "a\x00b", "run\n", "Run", "-ab", "ab-", "a--b", "", None):
            self.assertRaises(BadId, check_id, bad)
        self.assertEqual(attempt_id("room213-golden-repro-v1", 1), "room213-golden-repro-v1-a01")

    def test_duplicate_simultaneous_launch(self):
        store = MemoryStore()
        a = RunLock(store, "r", "run-x", "run-x-a01", "c1", lambda c: False)
        b = RunLock(store, "r", "run-x", "run-x-a02", "c2", lambda c: False)
        self.assertTrue(a.acquire()["acquired"])
        self.assertRaisesRegex(LockRefused, "not proven inactive", b.acquire)
        self.assertRaises(LockRefused, RunLock(store, "r", "run-x", "run-x-a01", "c9", lambda c: True).acquire)

    def test_race_many_threads(self):
        store = MemoryStore(); wins = []
        def go(i):
            try:
                RunLock(store, "r", "run-y", f"run-y-a{i:02d}", f"c{i}", lambda c: False).acquire(); wins.append(i)
            except LockRefused:
                pass
        ts = [threading.Thread(target=go, args=(i,)) for i in range(1, 17)]
        [t.start() for t in ts]; [t.join() for t in ts]
        self.assertEqual(len(wins), 1)

    def test_stale_heartbeat_alone_is_not_proof(self):
        import runlock
        store = MemoryStore(); RunLock(store, "r", "run-z", "run-z-a01", "c1", None).acquire()
        real = runlock._now; runlock._now = lambda: real() + 10 ** 6
        try:
            self.assertRaises(LockRefused, RunLock(store, "r", "run-z", "run-z-a02", "c2", lambda c: None).acquire)
            got = RunLock(store, "r", "run-z", "run-z-a02", "c2", lambda c: c == "c1").acquire()
            self.assertEqual(got["takeover"]["from"], "run-z-a01")
        finally:
            runlock._now = real

    def test_completed_blocks_and_old_owner_loses_lease(self):
        store = MemoryStore(); a = RunLock(store, "r", "run-q", "run-q-a01", "c1", None); a.acquire()
        RunLock(store, "r", "run-q", "run-q-a02", "c2", lambda c: True).acquire()
        self.assertRaises(LockRefused, a.heartbeat)
        store.put_if_absent("r/runs/run-q/COMPLETED.json", b"{}")
        self.assertRaisesRegex(LockRefused, "completed", RunLock(store, "r", "run-q", "run-q-a03", "c3",
                                                                  lambda c: True).acquire)

    def test_callback_retry_never_retrains(self):
        self.assertEqual(AUTOMATIC_RETRIES, 0)
        for status in (None, "training", "completed", "completed", "failed"):
            eff = callback_effect(status); self.assertFalse(eff["spawn"]); self.assertFalse(eff["retrain"])
        self.assertTrue(callback_effect("completed")["idempotent"])

    def test_cost_caps_and_ledger(self):
        self.assertEqual(assert_allowed("L40S", 40, None)["expectedUsd"], 1.3)
        self.assertRaises(CostRejected, assert_allowed, "L40S", 200, None)        # $6.50
        self.assertRaises(CostRejected, assert_allowed, "T4", 300, None)          # 5 h
        self.assertRaises(CostRejected, assert_allowed, "H100", 10, None)
        led = Ledger(FakeS3(), "b", "l.json")
        for i in range(3):
            led.record(f"x-a0{i}", "L40S", 3000, 3100, "stopped")
        full = led.load(); self.assertEqual(full["attemptCount"], 3)
        self.assertRaisesRegex(CostRejected, "prior", assert_allowed, "L40S", 40, None, full)


@unittest.skipUnless(POSIX, "process-group probes need POSIX (run via selftest on Modal)")
class ProcessProbes(Tmp):
    def test_silent_process_runtime_violation(self):
        from train_run import run_trainer
        res = run_trainer([sys.executable, "-c", "import time; time.sleep(120)"], self.w / "l.log", 3, poll_s=0.5,
                          grace_s=2)
        self.assertIn("runtime limit", res["stopReason"]); self.assertLess(res["elapsedS"], 15)
        self.assertNotEqual(res["exitCode"], 0)

    def test_hook_exception_still_stops_trainer(self):
        from train_run import run_trainer
        def boom(_):
            raise RuntimeError("R2 down")
        res = run_trainer([sys.executable, "-c", "import time; time.sleep(120)"], self.w / "l.log", 60, poll_s=0.5,
                          grace_s=2, on_poll=boom)
        self.assertIn("poll hook failed", res["stopReason"]); self.assertLess(res["elapsedS"], 15)

    def test_real_sigabrt_and_exit7_rejected(self):
        from train_run import run_trainer
        for code_src, want in (("import os; print('step  100/100'); os.abort()", -6),
                               ("import sys; print('step  100/100'); sys.exit(7)", 7)):
            res = run_trainer([sys.executable, "-c", code_src], self.w / "l.log", 60, poll_s=0.2)
            self.assertEqual(res["exitCode"], want)
            self.assertRaises(GateRejected, exit_acceptable, res["exitCode"],
                              (self.w / "l.log").read_text() + good_log())


if __name__ == "__main__":
    unittest.main(verbosity=2)
