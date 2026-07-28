r"""FREE/OPEN-SOURCE 3D + ortho path: run OpenMVS directly on the EXISTING
COLMAP dense workspace (skips the SfM/Poisson stages that made ODM time out).

OpenMVS binaries ship inside the opendronemap/odm image we already pulled, so
there is nothing new to install. Pipeline:
  InterfaceCOLMAP -> ReconstructMesh (depth 9-10) -> decimate -> TextureMesh
  -> OBJ/MTL  (then gltfpack/Draco -> GLB for the viewer)

Launches a detached Modal Sandbox; prints the sandbox id.
"""
import modal

app = modal.App.lookup("slate360-openmvs", create_if_missing=True)
img = modal.Image.from_registry("opendronemap/odm:3.5.4").dockerfile_commands(
    ["ENTRYPOINT []"])
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
set -x
# locate the OpenMVS binaries inside the ODM image
BIN=$(dirname $(find / -name "ReconstructMesh" -type f 2>/dev/null | head -1))
echo "OPENMVS_BIN=$BIN"
if [ -z "$BIN" ]; then echo "NO_OPENMVS_FOUND"; ls -la /code 2>/dev/null; exit 3; fi
$BIN/ReconstructMesh --help 2>&1 | head -5

W=/data/work
OUT=$W/openmvs
mkdir -p $OUT
ls -la $W/dense | head

# 1) import the existing COLMAP dense workspace
$BIN/InterfaceCOLMAP -i $W/dense -o $OUT/scene.mvs --image-folder $W/dense/images
echo "INTERFACE_EXIT=$?"
ls -la $OUT

# 2) mesh from the existing fused point cloud (depth 9 per panel guidance)
$BIN/ReconstructMesh $OUT/scene.mvs -p $W/dense/fused.ply -o $OUT/scene_mesh.mvs \
  --smooth 0 --remove-spurious 30 --remove-spikes 1 --close-holes 30 \
  --decimate 0.3
echo "MESH_EXIT=$?"
ls -la $OUT

# 3) texture from the original photos
$BIN/TextureMesh $OUT/scene_mesh.mvs -o $OUT/coverage.mvs --export-type obj \
  --resolution-level 1
echo "TEXTURE_EXIT=$?"
ls -la $OUT
echo "OPENMVS_DONE"
"""

sb = modal.Sandbox.create(
    "bash", "-c", CMD,
    image=img, volumes={"/data": vol},
    timeout=8 * 3600, cpu=16, memory=65536, app=app,
)
print("SANDBOX:", sb.object_id)
