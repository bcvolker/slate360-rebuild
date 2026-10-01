"""R213-LFS-IGS-1: build LichtFeld Studio at the PINNED commit on Modal (CPU-only container), cache the build on the volume.
Base image: nvidia/cuda:12.8.1-devel-ubuntu24.04 (upstream docker/Dockerfile uses nvidia/cuda:${CUDA_VERSION}-devel-ubuntu24.04),
gcc-14, CMake 4.0.3, vcpkg (baseline from the repo's vcpkg-configuration.json), preset `linux-release`.
CUDA arch: no nvidia-smi in a CPU container -> upstream CMake falls back to sm_86 SASS (CMakeLists.txt:397-400), which runs on
the L40S (sm_89, same major). Recorded in build_info.json. Usage:
  modal deploy lfs_build.py ; python -c "import modal; print(modal.Function.from_name('slate360-lfs-build','build_v4').spawn().object_id)"
"""
import modal

COMMIT = "c72a0d8554a33371ccd97df1e9fbe480d0981fdd"
app = modal.App("slate360-lfs-build")
vol = modal.Volume.from_name("slate360-recon-experiments")
APT = ("git curl unzip zip tar pkg-config ninja-build ccache python3 python3-dev gcc-14 g++-14 gfortran-14 "
       "libxinerama-dev libxcursor-dev xorg-dev libglu1-mesa-dev libwayland-dev libxkbcommon-dev libegl-dev libdecor-0-dev "
       "libibus-1.0-dev libdbus-1-dev libsystemd-dev libgtk-3-dev nasm autoconf autoconf-archive automake libtool "
       "wget ca-certificates bison flex libvulkan1 libltdl-dev zstd").split()
image = (modal.Image.from_registry("nvidia/cuda:12.8.1-devel-ubuntu24.04", add_python="3.11")
         .apt_install(*APT)
         .run_commands("update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 60",
                       "update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-14 60",
                       "update-alternatives --install /usr/bin/cc cc /usr/bin/gcc-14 60",
                       "update-alternatives --install /usr/bin/c++ c++ /usr/bin/g++-14 60",
                       "wget -q https://github.com/Kitware/CMake/releases/download/v4.0.3/cmake-4.0.3-linux-x86_64.sh -O /tmp/c.sh"
                       " && sh /tmp/c.sh --skip-license --prefix=/usr/local && rm /tmp/c.sh",
                       "git clone https://github.com/microsoft/vcpkg.git /opt/vcpkg && /opt/vcpkg/bootstrap-vcpkg.sh -disableMetrics")
         .env({"VCPKG_ROOT": "/opt/vcpkg", "PATH": "/opt/vcpkg:/usr/local/bin:/usr/local/cuda/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin"}))
OUT = f"/vol/tools/lichtfeld/{COMMIT[:8]}"


@app.function(image=image, cpu=32.0, memory=65536, timeout=6 * 3600, volumes={"/vol": vol}, retries=0)
def build_v4() -> dict:
    import json, os, subprocess, time, hashlib
    from pathlib import Path
    vol.reload(); Path(OUT).mkdir(parents=True, exist_ok=True)
    if Path(f"{OUT}/lfs.tar.zst").exists(): return {"cached": True}
    log = open(f"{OUT}/build.log", "w"); t0 = time.time()

    def sh(cmd, cwd=None):
        log.write(f"\n$ {cmd}\n"); log.flush()
        r = subprocess.run(cmd, shell=True, cwd=cwd, stdout=log, stderr=subprocess.STDOUT)
        vol.commit()
        if r.returncode: raise RuntimeError(f"failed ({r.returncode}): {cmd}")

    src = "/root/LichtFeld-Studio"
    sh(f"git clone https://github.com/MrNeRF/LichtFeld-Studio.git {src} && cd {src} && git checkout {COMMIT} && git submodule update --init --recursive")
    head = subprocess.run(["git", "-C", src, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    assert head == COMMIT, head
    flags = "--preset linux-release -DENABLE_COMPILER_CACHE=OFF"
    # nanobind stubgen imports the built module at build time; a CPU container has no libcuda.so.1, so expose the
    # toolkit's driver STUB on the build-time library path only (never at run time).
    sh("mkdir -p /root/cudastub && ln -sf /usr/local/cuda/lib64/stubs/libcuda.so /root/cudastub/libcuda.so.1")
    os.makedirs("/vol/tools/vcpkg-bincache", exist_ok=True)
    # SourceForge returned HTTP 522 for libuuid on 2026-09-30; seed vcpkg's download cache with the byte-identical
    # tarball from the MacPorts distfiles mirror (SHA-512 must equal vcpkg's ports/libuuid pin, else abort).
    sh("mkdir -p /opt/vcpkg/downloads && wget -q -O /opt/vcpkg/downloads/libuuid-1.0.3.tar.gz "
       "https://distfiles.macports.org/libuuid/libuuid-1.0.3.tar.gz && echo '77488caccc66503f6f2ded7bdfc4d3bc2c20b24a8dc95b2051633c695e99ec27876ffbafe38269b939826e1fdb06eea328f07b796c9e0aaca12331a787175507  "
       "/opt/vcpkg/downloads/libuuid-1.0.3.tar.gz' | sha512sum -c -")
    env = "VCPKG_DEFAULT_BINARY_CACHE=/vol/tools/vcpkg-bincache LD_LIBRARY_PATH=/root/cudastub"
    sh(f"{env} cmake {flags}", cwd=src)
    sh(f"{env} cmake --build --preset linux-release -j 32 --target LichtFeld-Studio", cwd=src)  # the app only: skips the dev-only committed-stub check
    bdir = f"{src}/build-linux-release"
    exe = f"{bdir}/LichtFeld-Studio"
    sha = hashlib.sha256(open(exe, "rb").read()).hexdigest()
    help_txt = subprocess.run([exe, "--help"], capture_output=True, text=True, timeout=120, env={**os.environ, "LD_LIBRARY_PATH": "/root/cudastub"})
    cache = open(f"{bdir}/CMakeCache.txt").read().splitlines()
    keep = [l for l in cache if l.split(":")[0] in ("CMAKE_CUDA_ARCHITECTURES", "CMAKE_BUILD_TYPE", "CMAKE_CUDA_COMPILER_VERSION", "VCPKG_TARGET_TRIPLET",
                                                    "BUILD_CUDA_PTX_ONLY", "BUILD_PORTABLE", "LFS_ENFORCE_LINUX_GUI_BACKENDS", "CMAKE_CXX_COMPILER")]
    info = {"commit": head, "exe": exe, "exe_sha256": sha, "base_image": "nvidia/cuda:12.8.1-devel-ubuntu24.04", "cmake_flags": flags,
            "cmake_cache": keep, "nvcc": subprocess.run(["nvcc", "--version"], capture_output=True, text=True).stdout[-200:],
            "help_rc": help_txt.returncode, "help_head": (help_txt.stdout + help_txt.stderr)[:1500], "build_s": round(time.time() - t0), "build_env": env}
    sh(f"tar -C /root -I 'zstd -T0 -3' -cf {OUT}/lfs.tar.zst LichtFeld-Studio")
    json.dump(info, open(f"{OUT}/build_info.json", "w"), indent=1); log.close(); vol.commit()
    return info
