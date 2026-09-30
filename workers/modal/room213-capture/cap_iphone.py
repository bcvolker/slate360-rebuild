"""Copy the Room 213 iPhone high-resolution stills of LiDAR-app capture 2a44da14 (2026-09-21, 419 ready photos,
4032x3024 JPEG, exposure locked 1/250 s ISO 666) from private R2 to the Modal volume, byte-for-byte: size checked against
digital_twin_capture_assets, SHA-256 computed on copy and recorded. RGB photos only (no LiDAR / pose data used)."""
import modal

from cap_ingest import DST, image, s3c

app = modal.App("slate360-room213-capture-iphone")
vol = modal.Volume.from_name("slate360-recon-experiments")
secret = modal.Secret.from_name("slate360-twin-worker")


@app.function(image=image.add_local_file("cap_ingest.py", "/root/cap_ingest.py"), cpu=8.0, memory=16384, timeout=3 * 3600,
              secrets=[secret], volumes={"/vol": vol})
def copy_photos(rows: list) -> dict:
    import hashlib, json
    from pathlib import Path
    s3, b = s3c()
    out = Path(f"{DST}/iphone_2a44da14")
    out.mkdir(parents=True, exist_ok=True)
    res = []
    for r in rows:
        name = f"{int(r['sort_order']):04d}_{r['storage_key'].split('/')[-1]}"
        h = hashlib.sha256()
        data = s3.get_object(Bucket=b, Key=r["storage_key"])["Body"].read()
        h.update(data)
        (out / name).write_bytes(data)
        res.append({"file": name, "storage_key": r["storage_key"], "bytes": len(data), "db_bytes": int(r["file_size_bytes"]),
                    "sha256": h.hexdigest(), "size_ok": len(data) == int(r["file_size_bytes"]), "created_at": r["created_at"]})
    json.dump(res, open(out / "manifest.json", "w"), indent=1)
    vol.commit()
    return {"photos": len(res), "size_ok": sum(x["size_ok"] for x in res), "bytes": sum(x["bytes"] for x in res)}
