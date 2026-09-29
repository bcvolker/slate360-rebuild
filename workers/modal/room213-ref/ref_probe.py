"""Probe: does the official v2026.9.24 release decode .insv in-process (patented decoder)? Read-only on the volume."""
import modal
app = modal.App("slate360-room213-ref-probe")
vol = modal.Volume.from_name("slate360-recon-experiments")
REL = "https://github.com/harry7557558/spirula-studio/releases/download/v2026.9.24/spirula-2026.9.24-ubuntu-vulkan-x86_64.zip"
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11")
         .apt_install("libvulkan1", "vulkan-tools", "unzip", "wget", "ffmpeg", "libgomp1", "libgl1", "libglib2.0-0t64", "libegl1", "libx11-6",
                      "libxext6", "libopengl0", "libglx0", "libxrandr2", "libxinerama1", "libxcursor1", "libxi6", "libwayland-client0", "libxkbcommon0", "libdbus-1-3", "libgtk-3-0t64")
         .run_commands(f"wget -q -O /tmp/sp.zip {REL} && mkdir -p /opt/spirula && cd /opt/spirula && unzip -q /tmp/sp.zip",
                       "mkdir -p /usr/share/vulkan/icd.d && echo '{\"file_format_version\":\"1.0.0\",\"ICD\":{\"library_path\":\"libGLX_nvidia.so.0\",\"api_version\":\"1.3\"}}' > /usr/share/vulkan/icd.d/nvidia_icd.json")
         .env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"}))
RAW = "/vol/room213/2026-09-21/raw-capture-test"

@app.function(image=image, gpu="L40S", timeout=900, volumes={"/vol": vol.read_only()})
def probe():
    import subprocess
    cmds = [f"/opt/spirula/spirula sam video --info {RAW}/VID_20260921_111410_00_075.insv 2>&1 | head -40",
            "/opt/spirula/spirula sam devices 2>&1 | head", "/opt/spirula/spirula sam extract --help 2>&1 | head -80",
            f"ffprobe -v error -show_entries stream=index,codec_name,width,height,r_frame_rate,nb_frames -of compact {RAW}/VID_20260921_111410_00_075.insv"]
    return {c[:60]: subprocess.run(["bash", "-c", c], capture_output=True, text=True).stdout[-5000:] for c in cmds}

@app.local_entrypoint()
def main():
    for k, v in probe.remote().items(): print("=====", k); print(v)
