r"""Post-process the finished Poisson mesh -> web GLB.

mesh_raw.ply (2.66M verts / 5.31M faces) already exists on the volume; only the
decimation+export failed. Use dependency-free voxel-cluster decimation (numpy
only) so no image build is required -- trimesh 3.17 ships in the ODM image.
"""
import modal

app = modal.App.lookup("slate360-mesh-post2", create_if_missing=True)
img = modal.Image.from_registry("opendronemap/odm:3.5.4").dockerfile_commands(
    ["ENTRYPOINT []"])
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
set -x
python3 - <<'PY'
import numpy as np, trimesh, json, os
m = trimesh.load('/data/work/mesh/mesh_raw.ply', process=False)
print('loaded:', len(m.vertices), 'verts', len(m.faces), 'faces', flush=True)

try:
    comps = m.split(only_watertight=False)
    if len(comps) > 1:
        m = max(comps, key=lambda c: len(c.faces))
        print('largest component:', len(m.faces), 'faces', flush=True)
except Exception as e:
    print('split skipped:', e, flush=True)

V = np.asarray(m.vertices, dtype=np.float64)
F = np.asarray(m.faces, dtype=np.int64)
try:
    C = np.asarray(m.visual.vertex_colors)[:, :3].astype(np.float64)
    if C.shape[0] != V.shape[0]:
        C = None
except Exception:
    C = None
print('colors:', None if C is None else C.shape, flush=True)

def voxel_decimate(V, F, C, target_faces):
    lo, hi = V.min(0), V.max(0)
    span = float((hi - lo).max())
    vox = span / 900.0          # start; grow until face count fits
    for _ in range(14):
        q = np.floor((V - lo) / vox).astype(np.int64)
        key = (q[:, 0] << 42) ^ (q[:, 1] << 21) ^ q[:, 2]
        uniq, inv = np.unique(key, return_inverse=True)
        nV = np.zeros((len(uniq), 3))
        np.add.at(nV, inv, V)
        cnt = np.bincount(inv, minlength=len(uniq)).reshape(-1, 1)
        nV /= np.maximum(cnt, 1)
        nF = inv[F]
        good = (nF[:, 0] != nF[:, 1]) & (nF[:, 1] != nF[:, 2]) & (nF[:, 0] != nF[:, 2])
        nF = nF[good]
        nF = np.unique(np.sort(nF, axis=1), axis=0)
        if len(nF) <= target_faces or vox > span / 20:
            nC = None
            if C is not None:
                nC = np.zeros((len(uniq), 3))
                np.add.at(nC, inv, C)
                nC /= np.maximum(cnt, 1)
            return nV, nF, nC
        vox *= 1.28
    return nV, nF, None

TARGET = 600000
if len(F) > TARGET:
    V, F, C = voxel_decimate(V, F, C, TARGET)
    print('decimated:', len(F), 'faces', len(V), 'verts', flush=True)

m2 = trimesh.Trimesh(vertices=V, faces=F, process=False)
if C is not None:
    rgba = np.hstack([np.clip(C, 0, 255).astype(np.uint8),
                      np.full((len(C), 1), 255, np.uint8)])
    m2.visual.vertex_colors = rgba

m2.export('/data/work/mesh/coverage.glb')
sz = os.path.getsize('/data/work/mesh/coverage.glb')
b = m2.bounds
print('GLB bytes:', sz, flush=True)
print('bounds:', b.tolist(), flush=True)
json.dump({'faces': int(len(m2.faces)), 'verts': int(len(m2.vertices)),
           'glb_bytes': int(sz),
           'bounds_min': b[0].tolist(), 'bounds_max': b[1].tolist()},
          open('/data/work/mesh/coverage_meta.json', 'w'), indent=1)
PY
echo "POST_DONE"
ls -la /data/work/mesh
"""

sb = modal.Sandbox.create("bash", "-c", CMD, image=img, volumes={"/data": vol},
                          timeout=2 * 3600, cpu=16, memory=65536, app=app)
print("SANDBOX:", sb.object_id)
