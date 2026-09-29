"""Smoke test: official Spirula Studio v2026.9.24 Ubuntu Vulkan release on a Modal NVIDIA GPU."""
import modal
app = modal.App("slate360-room213-ref-smoke")
REL = "https://github.com/harry7557558/spirula-studio/releases/download/v2026.9.24/spirula-2026.9.24-ubuntu-vulkan-x86_64.zip"
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11")
         .apt_install("libvulkan1", "vulkan-tools", "unzip", "wget", "ffmpeg", "libgomp1", "libgl1", "libglib2.0-0t64", "libegl1", "libx11-6", "libxext6", "libopengl0", "libglx0", "libxrandr2", "libxinerama1", "libxcursor1", "libxi6", "libwayland-client0", "libxkbcommon0", "libdbus-1-3", "libgtk-3-0t64")
         .run_commands(f"wget -q -O /tmp/sp.zip {REL} && mkdir -p /opt/spirula && cd /opt/spirula && unzip -q /tmp/sp.zip && ls -R /opt/spirula | head -30",
                       "mkdir -p /usr/share/vulkan/icd.d && echo '{\"file_format_version\":\"1.0.0\",\"ICD\":{\"library_path\":\"libGLX_nvidia.so.0\",\"api_version\":\"1.3\"}}' > /usr/share/vulkan/icd.d/nvidia_icd.json")
         .env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"}))

@app.function(image=image, gpu="L40S", timeout=900)
def smoke():
    import subprocess, glob, hashlib
    out = {}
    for c in ("ls -la /opt/spirula; find /opt/spirula -maxdepth 3 -type f | head -20",
              "ls /usr/lib/x86_64-linux-gnu | grep -i nvidia | head -30", "vulkaninfo --summary 2>&1 | grep -A12 -i devices", "ldd /opt/spirula/spirula | grep -i 'not found'"):
        out[c[:40]] = subprocess.run(["bash", "-c", c], capture_output=True, text=True).stdout[-3000:]
    b = [p for p in glob.glob("/opt/spirula/**/spirula", recursive=True)]
    out["bin"] = b
    if b:
        out["sha"] = hashlib.sha256(open(b[0], "rb").read()).hexdigest()
        for c in ("--version", "sfm --help", "sam --help", "train --help"):
            r = subprocess.run(["bash", "-c", f"{b[0]} {c} 2>&1 | head -60"], capture_output=True, text=True); out[c] = r.stdout[-4000:]
    return out

@app.local_entrypoint()
def main():
    r = smoke.remote()
    for k, v in r.items(): print("=====", k); print(v)
