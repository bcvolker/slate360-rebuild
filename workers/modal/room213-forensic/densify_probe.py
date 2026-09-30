"""Densification-score probe (MEASUREMENT ONLY). Spirula v2026.9.24 source (tag, 183b2c6) + a dump-only patch in
EngineDensify.cpp: at listed refinement steps it copies to disk, just BEFORE the parent draw and just AFTER it,
  means (float3) | log-scales (float3) | opacity logits | radii (last view, px) | accum_buffer (float2: [score, n])
It changes no computation (device->host copies at refine steps only). Built with the existing stock CUDA recipe
(release A used the Vulkan backend of the same source; see report for the equivalence check). The replay runs A's exact
dataset and command and is killed after step KILL_AT; the model is discarded."""
import modal

app = modal.App("slate360-room213-densify-probe")
vol = modal.Volume.from_name("slate360-recon-experiments")
CUDA_BASE_IMAGE = "nvidia/cuda:12.8.1-devel-ubuntu22.04"
build_image = (modal.Image.from_registry(CUDA_BASE_IMAGE, add_python="3.11")
               .apt_install("git", "wget", "ca-certificates", "build-essential", "ninja-build", "libgomp1", "libgl1", "libglib2.0-0", "python3")
               .run_commands("pip install cmake==3.31.6").pip_install("numpy").env({"NVIDIA_DRIVER_CAPABILITIES": "compute,utility"}))
TOOL = "/vol/tools/spirula/183b2c6-densify-probe"
A_WS = "/vol/room213/2026-09-29/capture/conditions/A/ws"
OUT = "/vol/room213/2026-09-29/forensic/densify_probe"
ANCHOR_PRE = "    int num_added = 0;\n"
ANCHOR_POST = "    // Reset accum buffer after densification step\n"
PATCH_FN = r'''
    // --- slate360 dump-only instrumentation: device->host copies at listed refine steps, no effect on training ---
    auto s360_dump = [&](const char* tag, int64_t n) {
        const char* dir = std::getenv("SS_DENSIFY_DUMP_DIR"); const char* steps = std::getenv("SS_DENSIFY_DUMP_STEPS");
        if (!dir || !steps || !do_densify) return;
        std::string key = std::string(",") + steps + ",";
        if (key.find("," + std::to_string(step) + ",") == std::string::npos) return;
        std::string path = std::string(dir) + "/step" + std::to_string(step) + "_" + tag + ".bin";
        FILE* f = std::fopen(path.c_str(), "wb"); if (!f) return;
        int64_t hdr[2] = {n, (int64_t)step}; std::fwrite(hdr, sizeof(hdr), 1, f);
        auto put = [&](const void* dptr, size_t elem, int64_t avail) {
            std::vector<uint8_t> h((size_t)n * elem, 0);
            int64_t m = std::min<int64_t>(n, avail);
            if (dptr && m > 0) backend::memcpy_sync(h.data(), (void*)dptr, (size_t)m * elem, backend::MemcpyKind::DeviceToHost);
            std::fwrite(h.data(), 1, h.size(), f);
        };
        put(dv_means.data_ptr(), sizeof(float3), (int64_t)dv_means.size());
        put(dv_scales.data_ptr(), sizeof(float3), (int64_t)dv_scales.size());
        put(dv_opacs.data_ptr(), sizeof(float), (int64_t)dv_opacs.size());
        put(dv_radii.data_ptr(), sizeof(float), (int64_t)dv_radii.size());
        put(dv_accum_buf.data_ptr(), sizeof(float2), (int64_t)dv_accum_buf.size());
        std::fclose(f);
    };
    s360_dump("pre", cur_num_splats);
'''


@app.function(image=build_image, cpu=32.0, memory=131072, timeout=4 * 3600, volumes={"/vol": vol})
def build_probe_v1() -> dict:
    import subprocess, hashlib, shutil, time
    from pathlib import Path
    t0 = time.time(); src = Path("/tmp/spirula"); log = []
    r = subprocess.run(["bash", "-c", f"git clone -q https://github.com/harry7557558/spirula-studio.git {src} && cd {src} && git checkout -q v2026.9.24 && git rev-parse HEAD"],
                       capture_output=True, text=True); full = r.stdout.strip().splitlines()[-1]
    assert full.startswith("183b2c6"), full
    f = src / "src/engine/EngineDensify.cpp"; s = f.read_text()
    assert s.count(ANCHOR_PRE) == 1 and s.count(ANCHOR_POST) == 1
    s = s.replace(ANCHOR_PRE, PATCH_FN + "\n" + ANCHOR_PRE, 1)
    s = s.replace(ANCHOR_POST, '    s360_dump("post", cur_num_splats + num_added);\n\n' + ANCHOR_POST, 1)
    if "#include <cstdio>" not in s: s = "#include <cstdio>\n#include <cstdlib>\n#include <string>\n#include <vector>\n#include <algorithm>\n" + s
    f.write_text(s)
    diff = subprocess.run(["bash", "-c", f"cd {src} && git diff --stat && git diff | sha256sum"], capture_output=True, text=True).stdout
    b = subprocess.run(["bash", "-c", f"cd {src} && bash build_develop.bash -DSS_BACKEND=cuda -DSS_BUILD_GUI=OFF -DTORCH_CUDA_ARCH_LIST=8.9 "
                        "-DSS_CHECK_COMMENTS=OFF -DCMAKE_CXX_FLAGS=\"-include stddef.h\""], capture_output=True, text=True)
    binp = src / "build_cuda/spirula"; out = {"commit": full, "patch": diff, "ok": binp.is_file(), "elapsed_s": round(time.time() - t0),
                                          "errors": [l for l in (b.stdout + b.stderr).splitlines() if " error" in l.lower()][:20], "tail": (b.stdout + b.stderr)[-1200:]}
    if binp.is_file():
        Path(TOOL).mkdir(parents=True, exist_ok=True); shutil.copy(binp, f"{TOOL}/spirula")
        out["sha256"] = hashlib.sha256(open(binp, "rb").read()).hexdigest(); vol.commit()
    return out


@app.function(image=build_image, gpu="L40S", cpu=16.0, memory=131072, timeout=3 * 3600, volumes={"/vol": vol}, retries=0)
def replay_v1(steps: str, kill_at: int = 14100) -> dict:
    import os, subprocess, time, re, shutil
    from pathlib import Path
    vol.reload(); b = "/tmp/spirula_probe"; shutil.copy(f"{TOOL}/spirula", b); os.chmod(b, 0o755)
    D = Path(f"{OUT}/dumps"); D.mkdir(parents=True, exist_ok=True); log = open(f"{OUT}/replay.log", "w")
    env = {**os.environ, "SS_DENSIFY_DUMP_DIR": str(D), "SS_DENSIFY_DUMP_STEPS": steps}
    cmd = [b, "train", "360-camera", "--data", A_WS, "--image-dir", "images", "--mask-dir", "masks", "--output-dir-prefix", f"/tmp/probe_out",
           "--output-dir-name", "probe", "--disable-viewer", "1", "--device", "0"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env); last = 0; t0 = time.time()
    for line in p.stdout:
        log.write(line); m = re.match(r"step\s+(\d+)/", line)
        if m: last = int(m.group(1))
        if last >= kill_at: p.kill(); break
    p.wait(); log.close()
    for f in ("config.json", "scene_transform.json"):
        q = Path(f"/tmp/probe_out/probe/{f}")
        if q.exists(): shutil.copy(q, f"{OUT}/{f}")
    vol.commit()
    return {"last_step": last, "seconds": round(time.time() - t0), "dumps": sorted(p.name for p in D.iterdir())}
