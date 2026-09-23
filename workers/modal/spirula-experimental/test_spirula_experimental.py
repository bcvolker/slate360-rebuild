"""Local gates. No GPU, no Room 213, no Spirula binary."""

from __future__ import annotations

import struct
import tempfile
import unittest
from pathlib import Path

from colmap_validate import ImportRejected
from cost_guard import CostRejected, assert_allowed
from lifecycle import StatusError, transition
from package_validate import validate_package
from ply_validate import PlyRejected, inspect_ply
from preview import render_centers
from synthetic_dataset import build
from train_command import argv, room213_command, smoke_overrides
from train_run import TrainOverrun, run_command


def _ply(path: Path, xyz: tuple[float, float, float]) -> None:
    props = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
    header = "ply\nformat binary_little_endian 1.0\nelement vertex 1\n" + "".join(f"property float {name}\n" for name in props) + "end_header\n"
    values = [xyz[0], xyz[1], xyz[2], 0, 0, 0, 0.1, 0.1, 0.1, 1, -2, -2, -2, 1, 0, 0, 0]
    path.write_bytes(header.encode("ascii") + struct.pack("<" + "f" * len(values), *values))


class Gates(unittest.TestCase):
    def test_package_accepts_two_lenses(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = build(Path(tmp))
            report = validate_package(root)
            self.assertEqual(report["imageCount"], 2)
            self.assertLess(report["reprojectionMeanPx"], 0.05)
            self.assertEqual(len(report["lenses"]), 2)

    def test_scale_and_checksum_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = build(Path(tmp) / "scale")
            text = (root / "manifest.json").read_text(encoding="utf-8").replace('"scale": 1.0', '"scale": 12.0')
            (root / "manifest.json").write_text(text, encoding="utf-8")
            with self.assertRaises(ImportRejected):
                validate_package(root)
            root = build(Path(tmp) / "hash")
            text = (root / "manifest.json").read_text(encoding="utf-8")
            text = text.replace('"sha256": "', '"sha256": "dead', 1)
            (root / "manifest.json").write_text(text, encoding="utf-8")
            with self.assertRaises(ImportRejected):
                validate_package(root)

    def test_cost_and_status(self):
        smoke = assert_allowed("T4", 20, None)
        self.assertLess(smoke["expectedUsd"], 5)
        with self.assertRaises(CostRejected):
            assert_allowed("A100", 120, None)
        self.assertTrue(assert_allowed("A100", 120, "BRIAN_APPROVED")["approved"])
        self.assertEqual(transition("queued", "preparing"), "preparing")
        with self.assertRaises(StatusError):
            transition("queued", "training")
        with self.assertRaises(StatusError):
            transition("completed", "training")

    def test_ply_preview_and_command_lock(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = build(Path(tmp))
            ply = Path(tmp) / "splat.ply"
            _ply(ply, (0, 0, 5))
            info = inspect_ply(ply)
            self.assertEqual(info["gaussianCount"], 1)
            preview = render_centers(root, ply, Path(tmp) / "preview.png")
            self.assertGreaterEqual(preview["previewHits"], 1)
            self.assertTrue((Path(tmp) / "preview.png").is_file())
        cmd = argv("/data", "smoke", None, smoke_overrides())
        self.assertIn("--warp-to-pinhole", cmd)
        self.assertEqual(cmd[cmd.index("--warp-to-pinhole") + 1], "false")
        self.assertIn("--save-full-checkpoint", cmd)
        resumed = argv("/data", "smoke", "/ckpt", smoke_overrides())
        self.assertIn("--resume", resumed)
        with self.assertRaises(RuntimeError):
            argv("/data", "big", None, {**smoke_overrides(), "cap_max": 1_000_000})
        documented = room213_command("/room213")
        self.assertIn("1000000", documented)
        self.assertNotIn("360-camera", documented)

    def test_overrun_kills_process(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(TrainOverrun):
                run_command(
                    ["python", "-c", "import time; time.sleep(5); print('done')"],
                    Path(tmp) / "log.txt",
                    expected_seconds=0.2,
                )

    def test_resume_roundtrip_with_fake_binary(self):
        fake = Path(__file__).with_name("_fake_spirula.py")
        fake.write_text(
            "import sys\nfrom pathlib import Path\n"
            "args=sys.argv\n"
            "name=args[args.index('--output-dir-name')+1]\n"
            "out=Path('outputs')/name\nout.mkdir(parents=True, exist_ok=True)\n"
            "step=out/'step-000000002.ckpt'\nstep.mkdir(exist_ok=True)\n"
            "(step/'state.txt').write_text('ok', encoding='utf-8')\n"
            "if '--resume' in args:\n"
            "    props='x y z f_dc_0 opacity scale_0 rot_0'.split()\n"
            "    import struct\n"
            "    header='ply\\nformat binary_little_endian 1.0\\nelement vertex 1\\n'+''.join(f'property float {p}\\n' for p in props)+'end_header\\n'\n"
            "    (out/'splat.ply').write_bytes(header.encode()+struct.pack('<fffffff', 0,0,5, 0.1, 1, -2, 1))\n",
            encoding="utf-8",
        )
        try:
            with tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                build(work / "dataset")
                import os
                prev = os.getcwd()
                os.chdir(work)
                try:
                    from smoke_job import execute
                    result = execute(work, ["python", str(fake)], expected_seconds=30)
                finally:
                    os.chdir(prev)
                self.assertEqual(result["status"], "completed")
                self.assertTrue((work / "preview.png").is_file())
        finally:
            fake.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
