"""Driver for the R213-LFS-IGS-1 stages (each spawns lfs_run_v1 once; output under conditions/LFS_IGS1/runs/<tag>).
  python lfs_drive.py smoke       # 20 source images (100 faces, incl. the 4 close T_table images), 3,500 its at x5 scaling
  python lfs_drive.py resume      # resume the smoke checkpoint for 300 more its (checkpoint save/reload test)
  python lfs_drive.py loadcheck   # all 5,080 faces, 5,500 its (> one epoch) + eval of every image, no images saved
  python lfs_drive.py full        # THE single benchmark run: recipe x5 (150,000 its)
Schedule (decided before any run): steps_scaler 5 = Spirula A's per-face exposure (see the schedule doc)."""
import json, sys
import modal

CLOSE = ["VID_20260929_152303_00_079/cam0/01349.jpg", "VID_20260929_152303_00_079/cam0/01242.jpg",
         "VID_20260929_152303_00_079/cam0/01362.jpg", "VID_20260929_152303_00_079/cam0/01227.jpg"]
RUNS = "/vol/room213/2026-09-29/capture/conditions/LFS_IGS1/runs"
run = modal.Function.from_name("slate360-lfs-run", "lfs_run_v2")
vol = modal.Volume.from_name("slate360-recon-experiments")


def subset20():
    idx = json.loads(b"".join(vol.read_file("room213/2026-09-29/capture/conditions/LFS_IGS1/data/face_index.json")))
    srcs = sorted({r["src"] for r in idx}); others = [s for s in srcs if s not in CLOSE]
    return CLOSE + [others[int(i * len(others) / 16)] for i in range(16)]


stage = sys.argv[1]
if stage == "smoke":
    c = run.spawn("smoke", ["-i", "700", "--steps-scaler", "5", "--eval-all", "--eval-steps", "700"], subset20())
elif stage == "resume":
    c = run.spawn("smoke_resume", ["--resume", "RUNFILE:smoke/out/project.licht", "-i", "760", "--steps-scaler", "5"], subset20())
elif stage == "loadcheck":
    c = run.spawn("loadcheck2", ["-i", "1100", "--steps-scaler", "5", "--eval-all", "--eval-steps", "1100"], None,
                  {"enable_save_eval_images": False})
elif stage == "full":
    c = run.spawn("full", ["--steps-scaler", "5"], None)
else:
    raise SystemExit(stage)
print(stage, c.object_id)
