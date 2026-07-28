r"""DECISIVE 3D PATH: Poisson mesh directly from the COLMAP dense cloud.

Root cause of every ODM failure: ODM rebuilt its own dense cloud at 247M points
(6.9 GB) -> renderdem thrashed at 38 GB and Poisson returned a degenerate 36 KB
mesh. Our COLMAP cloud is 18.6M points (502 MB) with RGB per point -- 13x
smaller and entirely sufficient for a deck coverage model.

Pipeline (all binaries already inside the ODM image):
  PoissonRecon --colors --density  ->  trim low-density  ->  decimate  ->  GLB
"""
import modal

app = modal.App.lookup("slate360-mesh-colmap", create_if_missing=True)
img = (modal.Image.from_registry("opendronemap/odm:3.5.4")
       .dockerfile_commands(["ENTRYPOINT []"])
       .run_commands("python3 -m pip install --no-cache-dir trimesh numpy"))
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
set -x
BIN=/code/SuperBuild/install/bin
OUT=/data/work/mesh
mkdir -p $OUT
ls -la /data/work/dense/fused.ply

# Poisson on the COLMAP cloud (18.6M pts, has RGB). depth 11 is fine at this size.
$BIN/PoissonRecon --in /data/work/dense/fused.ply --out $OUT/mesh_raw.ply \
  --depth 11 --pointWeight 4.0 --samplesPerNode 1.5 --threads 16 \
  --colors --density --bType 2 --linearFit
echo "POISSON_EXIT=$?"
ls -la $OUT

python3 - <<'PY'
import numpy as np, trimesh, json, os
m = trimesh.load('/data/work/mesh/mesh_raw.ply', process=False)
print('raw mesh:', len(m.vertices), 'verts', len(m.faces), 'faces')
# trim low-density Poisson extrapolation (the "balloon" artifacts)
q = None
for name in ('density','quality','value'):
    if name in getattr(m, 'metadata', {}).get('_ply_raw', {}).get('vertex', {}).get('data', {}).dtype.names if False else []:
        pass
try:
    raw = m.metadata['_ply_raw']['vertex']['data']
    if 'density' in raw.dtype.names:
        q = np.asarray(raw['density']).ravel()
except Exception as e:
    print('no density field:', e)
if q is not None and len(q) == len(m.vertices):
    thr = np.quantile(q, 0.06)
    keep = q > thr
    m.update_vertices(keep)
    print('after density trim:', len(m.vertices), 'verts', len(m.faces), 'faces')
# largest connected component removes floating islands
try:
    comps = m.split(only_watertight=False)
    if len(comps) > 1:
        m = max(comps, key=lambda c: len(c.faces))
        print('largest component:', len(m.faces), 'faces')
except Exception as e:
    print('split skipped:', e)
# decimate to a web budget
target = 600000
if len(m.faces) > target:
    m = m.simplify_quadric_decimation(target)
    print('decimated:', len(m.faces), 'faces')
m.export('/data/work/mesh/coverage.glb')
print('GLB bytes:', os.path.getsize('/data/work/mesh/coverage.glb'))
b = m.bounds
json.dump({'faces': int(len(m.faces)), 'verts': int(len(m.vertices)),
           'bounds_min': b[0].tolist(), 'bounds_max': b[1].tolist()},
          open('/data/work/mesh/coverage_meta.json','w'), indent=1)
print('bounds', b.tolist())
PY
echo "MESH_DONE"
ls -la $OUT
"""

sb = modal.Sandbox.create("bash", "-c", CMD, image=img, volumes={"/data": vol},
                          timeout=6 * 3600, cpu=16, memory=65536, app=app)
print("SANDBOX:", sb.object_id)
