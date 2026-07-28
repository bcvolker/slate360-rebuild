
import modal
app = modal.App("colmap-stats")
vol = modal.Volume.from_name("asu-rgb-flights")
image = modal.Image.from_registry("colmap/colmap:latest", add_python="3.11")
@app.function(image=image, volumes={"/data": vol}, timeout=600)
def stats():
    import subprocess, os
    for m in sorted(os.listdir("/data/work/sparse")):
        r = subprocess.run(f"colmap model_analyzer --path /data/work/sparse/{m}",
                           shell=True, capture_output=True, text=True)
        print(f"=== model {m} ===")
        print((r.stdout or "") + (r.stderr or ""))
