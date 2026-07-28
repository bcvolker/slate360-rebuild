r"""THE STRATEGY THAT SHOULD ACTUALLY WORK.

Two days of failure came from hand-rolling photogrammetry finishing. All four
external reviews converge: stop hand-rolling, use a tool that already implements
the correct algorithms. `colmap mesh_texturer` (COLMAP 4.1.1, VERIFIED present)
does photo texturing with view selection + seam leveling, and it consumes
EXACTLY what we already have on the volume:
   --workspace_path /data/work/dense   (undistorted images + sparse model)
   --input_path     <poisson mesh ply>

Step 1 (open3d image): QUADRIC decimation 5.31M -> 800k faces.
  Reviews were unanimous that voxel-cluster decimation (what I used) rounds
  parapets and destroys the paint-line/drain-edge detail that texture baking
  needs. Quadric error metric preserves creases and flat-surface fidelity.
Step 2 (colmap image): mesh_texturer -> textured mesh PLY + texture atlas.

Output feeds BOTH deliverables:
  - 3D tab: photo-textured mesh (replaces vertex-colored)
  - 2D map: orthographic top-down render of the textured mesh is a properly
    view-selected, seam-levelled orthophoto -- which is the thing the custom
    winner-take-all + border-offset blender could never produce.
"""
import sys

import modal

STEP = sys.argv[1] if len(sys.argv) > 1 else "decimate"
vol = modal.Volume.from_name("asu-rgb-flights")

if STEP == "decimate":
    app = modal.App.lookup("slate360-decimate2", create_if_missing=True)
    img = (modal.Image.debian_slim(python_version="3.11")
           .apt_install("libgl1", "libglib2.0-0", "libgomp1")
           .pip_install("open3d==0.18.0", "numpy<2"))
    CMD = r"""
python3 - <<'PY'
import open3d as o3d, numpy as np
m = o3d.io.read_triangle_mesh('/data/work/mesh/mesh_raw.ply')
print('loaded', len(m.vertices), 'verts', len(m.triangles), 'tris', flush=True)
m.remove_duplicated_vertices(); m.remove_degenerate_triangles()
m.remove_unreferenced_vertices()
# keep the largest connected cluster (drops Poisson floating islands)
lab, cnt, _ = m.cluster_connected_triangles()
lab = np.asarray(lab); cnt = np.asarray(cnt)
keep = int(np.argmax(cnt))
m.remove_triangles_by_mask(lab != keep); m.remove_unreferenced_vertices()
print('largest cluster', len(m.triangles), 'tris', flush=True)
# QUADRIC decimation -- preserves creases/edges (voxel clustering did not)
d = m.simplify_quadric_decimation(target_number_of_triangles=800000)
d.remove_unreferenced_vertices(); d.compute_vertex_normals()
print('quadric decimated', len(d.vertices), 'verts', len(d.triangles), 'tris', flush=True)
o3d.io.write_triangle_mesh('/data/work/mesh/mesh_dec.ply', d,
                           write_vertex_colors=True, write_ascii=False)
print('WROTE mesh_dec.ply', flush=True)
PY
echo "DECIMATE_DONE"
ls -la /data/work/mesh/
"""
    cpu, mem, to = 8, 49152, 2 * 3600
else:
    app = modal.App.lookup("slate360-texture", create_if_missing=True)
    img = modal.Image.from_registry("colmap/colmap:latest")
    CMD = r"""
set -x
mkdir -p /data/work/mesh/textured
ls -la /data/work/dense | head
colmap mesh_texturer \
  --workspace_path /data/work/dense \
  --input_path /data/work/mesh/mesh_dec.ply \
  --output_path /data/work/mesh/textured \
  --output_type BIN
echo "TEXTURE_EXIT=$?"
ls -la /data/work/mesh/textured/
echo "TEXTURE_DONE"
"""
    cpu, mem, to = 16, 65536, 6 * 3600

sb = modal.Sandbox.create("bash", "-c", CMD, image=img, volumes={"/data": vol},
                          timeout=to, cpu=cpu, memory=mem, app=app)
print("SANDBOX:", sb.object_id)
