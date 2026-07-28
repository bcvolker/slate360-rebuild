
import modal
app = modal.App("georef-check")
vol = modal.Volume.from_name("asu-rgb-flights")
image = modal.Image.debian_slim(python_version="3.11").pip_install("numpy")
@app.function(image=image, volumes={"/data": vol}, timeout=600, memory=16384)
def georef():
    import numpy as np
    z = np.load("/data/work/ortho/dem.npz")
    print("ORTHO_GEOREF", {"gsd_m": float(z["gsd_m"]), "origin": [float(v) for v in z["origin"]],
                           "shape": list(z["dem"].shape)})
