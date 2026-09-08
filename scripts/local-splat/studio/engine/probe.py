#!/usr/bin/env python3
"""Inventory a dropped capture. Tells the studio what kind of data is present
and what each piece will be used for, before anything is processed.

    probe.py --inputs <file-or-dir> [...] --out probe.json

Detects: 360 vs 2D video/stills, camera make/model, GPS in EXIF or video
metadata, DJI flight logs, Slate360 iPhone captures (.s360depth, ARKit
trajectories), LiDAR point clouds, RTK/GNSS logs. Read-only.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

STILL = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic", ".dng"}
VIDEO = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}
RAW360 = {".insv", ".insp"}
CLOUD = {".ply", ".las", ".laz", ".e57", ".pcd", ".pts"}
GNSS = {".pos", ".obs", ".nav", ".rinex", ".ubx", ".nmea", ".gpx"}
LOG = {".srt", ".csv", ".txt", ".json"}


def ffprobe(path: Path) -> dict:
    try:
        raw = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)],
            capture_output=True, text=True, timeout=120,
        ).stdout
        return json.loads(raw or "{}")
    except Exception:
        return {}


def exif_of(path: Path) -> dict:
    try:
        from PIL import Image
        from PIL.ExifTags import GPSTAGS, TAGS
        im = Image.open(path)
        info = {"width": im.width, "height": im.height}
        ex = im.getexif()
        if ex:
            for k, v in ex.items():
                name = TAGS.get(k, str(k))
                if name in ("Make", "Model", "FocalLength", "DateTimeOriginal", "DateTime", "Software", "LensModel"):
                    info[name] = str(v)
            gps = ex.get_ifd(0x8825) if hasattr(ex, "get_ifd") else None
            if gps:
                info["gps"] = {GPSTAGS.get(k, str(k)): str(v) for k, v in gps.items()}
        xmp = getattr(im, "info", {}).get("xmp") or b""
        if b"GPano" in (xmp if isinstance(xmp, bytes) else xmp.encode()):
            info["gpano"] = True
        return info
    except Exception as exc:  # pragma: no cover
        return {"error": str(exc)}


def is_equirect(w: int, h: int) -> bool:
    return h > 0 and 1.9 <= (w / float(h)) <= 2.1


def classify_video(path: Path) -> dict:
    j = ffprobe(path)
    vs = [s for s in j.get("streams", []) if s.get("codec_type") == "video"]
    fmt = j.get("format", {})
    tags = {**fmt.get("tags", {}), **(vs[0].get("tags", {}) if vs else {})}
    w = int(vs[0].get("width", 0)) if vs else 0
    h = int(vs[0].get("height", 0)) if vs else 0
    fps = 0.0
    if vs and vs[0].get("r_frame_rate"):
        num, _, den = vs[0]["r_frame_rate"].partition("/")
        try:
            fps = float(num) / float(den or 1)
        except ValueError:
            fps = 0.0
    loc = tags.get("com.apple.quicktime.location.ISO6709") or tags.get("location") or tags.get("location-eng")
    make = tags.get("com.apple.quicktime.make") or tags.get("make") or ""
    model = tags.get("com.apple.quicktime.model") or tags.get("model") or ""
    spherical = any("spherical" in str(k).lower() or "projection" in str(k).lower() for k in tags)
    kind = "360" if (is_equirect(w, h) or spherical) else "2d"
    return {
        "role": "video", "kind": kind, "width": w, "height": h, "fps": round(fps, 3),
        "duration_s": round(float(fmt.get("duration", 0) or 0), 2), "codec": vs[0].get("codec_name", "") if vs else "",
        "bytes": int(fmt.get("size", path.stat().st_size)), "camera": (make + " " + model).strip(),
        "gps": bool(loc), "location": loc,
    }


def classify_still(path: Path) -> dict:
    ex = exif_of(path)
    w, h = int(ex.get("width", 0)), int(ex.get("height", 0))
    kind = "360" if (is_equirect(w, h) or ex.get("gpano")) else "2d"
    return {
        "role": "still", "kind": kind, "width": w, "height": h,
        "camera": " ".join(x for x in (ex.get("Make", ""), ex.get("Model", "")) if x).strip(),
        "focal": ex.get("FocalLength"), "gps": "gps" in ex, "taken": ex.get("DateTimeOriginal") or ex.get("DateTime"),
    }


def sniff_gnss_csv(path: Path) -> bool:
    try:
        head = path.read_text(errors="ignore")[:4000].lower()
    except Exception:
        return False
    return bool(re.search(r"\b(lat|latitude)\b", head) and re.search(r"\b(lon|lng|longitude)\b", head))


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--inputs", nargs="+", required=True)
    p.add_argument("--out", required=True)
    a = p.parse_args()

    files: list[Path] = []
    for raw in a.inputs:
        pth = Path(raw)
        if pth.is_dir():
            files.extend(sorted(f for f in pth.rglob("*") if f.is_file()))
        elif pth.exists():
            files.append(pth)

    items = []
    counts = {"video360": 0, "video2d": 0, "still360": 0, "still2d": 0, "raw360": 0, "lidar": 0,
              "arkit": 0, "gnss": 0, "logs": 0, "other": 0}
    cameras: set[str] = set()
    gps_any = False
    stills_seen = 0
    for f in files:
        ext = f.suffix.lower()
        name = f.name.lower()
        if ext in VIDEO:
            info = classify_video(f)
            counts["video360" if info["kind"] == "360" else "video2d"] += 1
            gps_any |= info["gps"]
            if info["camera"]:
                cameras.add(info["camera"])
        elif ext in STILL:
            stills_seen += 1
            # EXIF on every still is slow for thousands of frames; sample.
            info = classify_still(f) if stills_seen <= 40 or stills_seen % 25 == 0 else {"role": "still", "kind": "unknown"}
            if info.get("kind") == "360":
                counts["still360"] += 1
            elif info.get("kind") == "2d":
                counts["still2d"] += 1
            gps_any |= bool(info.get("gps"))
            if info.get("camera"):
                cameras.add(info["camera"])
            if stills_seen > 40 and stills_seen % 25:
                continue
        elif ext in RAW360:
            info = {"role": "raw360"}
            counts["raw360"] += 1
        elif ext == ".s360depth" or "lidar_traj" in name or name in ("transforms.json", "arkit_poses.json"):
            info = {"role": "arkit"}
            counts["arkit"] += 1
        elif ext in CLOUD:
            info = {"role": "lidar"}
            counts["lidar"] += 1
        elif ext in GNSS or (ext == ".csv" and sniff_gnss_csv(f)):
            info = {"role": "gnss"}
            counts["gnss"] += 1
        elif ext in LOG:
            info = {"role": "log", "dji": name.endswith(".srt")}
            counts["logs"] += 1
            if name.endswith(".srt"):
                gps_any = True
        else:
            info = {"role": "other"}
            counts["other"] += 1
        items.append({"path": str(f), "name": f.name, "bytes": f.stat().st_size, **info})

    # Fill in unsampled still counts by proportion.
    sampled = counts["still360"] + counts["still2d"]
    if sampled and stills_seen > sampled:
        ratio360 = counts["still360"] / sampled
        counts["still360"] = int(round(stills_seen * ratio360))
        counts["still2d"] = stills_seen - counts["still360"]

    if counts["raw360"]:
        primary = "raw360"
    elif counts["video360"] or counts["still360"]:
        primary = "360" if not (counts["video2d"] or counts["still2d"]) else "mixed"
    elif counts["video2d"] or counts["still2d"]:
        primary = "2d"
    else:
        primary = "none"

    videos = [i for i in items if i.get("role") == "video"]
    total_s = sum(v.get("duration_s", 0) for v in videos)
    suggested_fps = 2.0 if total_s and total_s < 60 else 1.0 if total_s < 240 else 0.5

    summary = {
        "primary": primary,
        "counts": counts,
        "cameras": sorted(cameras),
        "video_seconds": round(total_s, 1),
        "suggested_fps": suggested_fps,
        "has_gps": gps_any,
        "has_lidar": counts["lidar"] > 0 or counts["arkit"] > 0,
        "has_arkit_poses": counts["arkit"] > 0,
        "has_gnss_log": counts["gnss"] > 0,
        "uses": {
            "appearance": "360 or 2D video/stills -> Gaussian splat (Reality layer)",
            "geometry": "LiDAR / ARKit depth -> mesh (Geometry layer, separate job)" if (counts["lidar"] or counts["arkit"]) else None,
            "georeference": "GPS / GNSS -> stored with the capture; not used for reconstruction yet" if (gps_any or counts["gnss"]) else None,
        },
        "warnings": [],
    }
    if counts["raw360"]:
        summary["warnings"].append("Raw .insv/.insp found. Stitch in Insta360 Studio first (horizon lock on, tilt recovery and vibration reduction off) and drop the stitched MP4.")
    if primary == "mixed":
        summary["warnings"].append("Both 360 and 2D sources found. Each is trained separately; pick one tab per job.")
    if counts["lidar"] or counts["arkit"]:
        summary["warnings"].append("LiDAR / ARKit data detected. It is not fused into the splat; it feeds the metric mesh job.")

    out = {"summary": summary, "items": items}
    Path(a.out).write_text(json.dumps(out, indent=2))
    print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
