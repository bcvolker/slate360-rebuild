"""Neutral copy of the repro zip for external sharing: text files scrubbed of project/company names, binary payloads
byte-identical. Original zip/object untouched. Upload to the private developer-share bucket, presign 7 days, verify."""
import modal
app = modal.App("dev-share-neutral")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = modal.Image.debian_slim(python_version="3.11").pip_install("boto3", "requests")
SRC = "/vol/room213/2026-09-29/share/room213_spirula_repro_2026-09-30.zip"
DST = "/vol/room213/2026-09-29/share/reproduction-package.zip"
K = "reproduction-package.zip"
SUBS = [("slate360-recon-experiments", "data-volume"), ("/vol/room213/2026-09-29", "/data"), ("slate360-room213-", "repro-"),
        ("slate360-", "repro-"), ("Slate360", ""), ("slate360", "repro"), ("Room 213: ", ""), ("Room 213", "the room"),
        ("room213_spirula_repro", "repro_package"), ("room213", "scene")]


def creds():
    vals = {}
    for line in open(r"C:\s360\.env.local", encoding="utf-8"):
        k, _, v = line.strip().partition("=")
        if k in ("DEV_SHARE_R2_ACCESS_KEY_ID", "DEV_SHARE_R2_SECRET_ACCESS_KEY", "DEV_SHARE_R2_BUCKET", "R2_ENDPOINT"): vals[k] = v.strip().strip('"')
    return vals


@app.function(image=image, volumes={"/vol": vol}, timeout=3 * 3600, cpu=4.0, memory=8192)
def build():
    import zipfile, hashlib, json, os, re, shutil
    zi = zipfile.ZipFile(SRC); man = []; out = zipfile.ZipFile(DST + ".tmp", "w", allowZip64=True)
    texts = (".md", ".py", ".json", ".txt", ".yaml")
    def scrub(s):
        for a, b in SUBS: s = s.replace(a, b)
        return s
    entries = [i for i in zi.infolist() if not i.filename.endswith("MANIFEST.json")]
    for i in entries:
        rel = scrub(i.filename.split("/", 1)[1]); h = hashlib.sha256(); n = 0
        if i.filename.endswith(texts):
            data = scrub(zi.read(i).decode("utf-8")).encode(); h.update(data); n = len(data)
            if rel != "README.md": man.append({"path": rel, "bytes": n, "sha256": h.hexdigest()})
            out.writestr("repro_package/" + rel, data, compress_type=zipfile.ZIP_DEFLATED)
        else:
            zinfo = zipfile.ZipInfo("repro_package/" + rel, date_time=i.date_time); zinfo.compress_type = zipfile.ZIP_STORED
            with zi.open(i) as fi, out.open(zinfo, "w", force_zip64=True) as fo:
                for b in iter(lambda: fi.read(1 << 24), b""): h.update(b); n += len(b); fo.write(b)
            man.append({"path": rel, "bytes": n, "sha256": h.hexdigest()})
    rd = scrub(zi.read("room213_spirula_repro/README.md").decode()).encode()
    man.append({"path": "README.md", "bytes": len(rd), "sha256": hashlib.sha256(rd).hexdigest()}); man.sort(key=lambda m: m["path"])
    out.writestr("repro_package/MANIFEST.json", json.dumps({"files": man}, indent=1), compress_type=zipfile.ZIP_DEFLATED); out.close()
    os.replace(DST + ".tmp", DST)
    z = zipfile.ZipFile(DST); bad = z.testzip()
    rx = re.compile(rb"(?i)slate360|room ?213|bcvolker|volker|@gmail|/vol/"); left = {}
    for i in z.infolist():
        if i.filename.endswith((".md", ".py", ".json", ".txt", ".yaml")) or True:
            if i.filename.endswith((".insv", ".ply", ".npy", ".bin", ".jpg", ".png")): continue
            m = sorted({x.group(0).decode() for x in rx.finditer(z.read(i))})
            if m: left[i.filename] = m
    names_left = [i.filename for i in z.infolist() if re.search(r"(?i)slate360|room213", i.filename)]
    h = hashlib.sha256()
    with open(DST, "rb") as f:
        for b in iter(lambda: f.read(1 << 24), b""): h.update(b)
    vol.commit()
    return {"bytes": os.path.getsize(DST), "sha256": h.hexdigest(), "bad": bad, "n": len(z.infolist()), "left": left, "names_left": names_left}


@app.function(image=image, volumes={"/vol": vol}, timeout=3 * 3600, cpu=4.0, memory=8192)
def upload(c: dict, sha: str):
    import time, hashlib, requests, boto3
    from botocore.config import Config
    from boto3.s3.transfer import TransferConfig
    vol.reload(); B = c["DEV_SHARE_R2_BUCKET"]
    s3 = boto3.client("s3", endpoint_url=c["R2_ENDPOINT"], aws_access_key_id=c["DEV_SHARE_R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=c["DEV_SHARE_R2_SECRET_ACCESS_KEY"], region_name="auto", config=Config(signature_version="s3v4"))
    s3.upload_file(DST, B, K, ExtraArgs={"ContentType": "application/zip"},
                   Config=TransferConfig(multipart_threshold=64 << 20, multipart_chunksize=128 << 20, max_concurrency=8))
    hb = s3.head_object(Bucket=B, Key=K)["ContentLength"]
    t0 = int(time.time()); url = s3.generate_presigned_url("get_object", Params={"Bucket": B, "Key": K}, ExpiresIn=604800)
    h = hashlib.sha256(); n = 0
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        for b in r.iter_content(1 << 22): h.update(b); n += len(b)
    base = f"{c['R2_ENDPOINT'].rstrip('/')}/{B}"
    return {"bucket": B, "url": url, "signed": t0, "expires": t0 + 604800, "head_bytes": hb, "dl_bytes": n, "sha_match": h.hexdigest() == sha,
            "unsigned_object": requests.get(f"{base}/{K}", headers={"Range": "bytes=0-15"}, timeout=60).status_code,
            "unsigned_bucket_list": requests.get(base, timeout=60).status_code}


@app.local_entrypoint()
def main():
    import json
    b = build.remote(); print(json.dumps(b, indent=1))
    assert not b["bad"] and not b["left"] and not b["names_left"], "scrub incomplete"
    r = upload.remote(creds(), b["sha256"]); json.dump({**r, "zip": b}, open("share3_result.json", "w"), indent=1)
    print(json.dumps({k: v for k, v in r.items() if k != "url"}, indent=1))
