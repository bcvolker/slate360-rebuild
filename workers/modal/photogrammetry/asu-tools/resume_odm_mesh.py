r"""FREE path, decisive: RESUME the existing ODM project from the meshing
stage with a sane octree depth.

The earlier run already completed opensfm (SfM), odm_filterpoints (dense) and
odm_georeferencing on /data/work/odm/asu — it only died in odm_meshing because
--mesh-octree-depth 11 on 18.6M points thrashes (panel diagnosis). Resuming
with depth 9 + mesh-size 300k reuses all completed work and produces BOTH:
  odm_texturing/odm_textured_model_geo.obj  (3D twin)
  odm_orthophoto/odm_orthophoto.tif         (properly blended 2D map)
"""
import modal

app = modal.App.lookup("slate360-odm-resume4", create_if_missing=True)
img = modal.Image.from_registry("opendronemap/odm:3.5.4").dockerfile_commands(
    ["ENTRYPOINT []"])
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
set -x
ls /data/work/odm/asu
python3 /code/run.py --project-path /data/work/odm asu \
  --rerun-from odm_meshing \
  --mesh-octree-depth 9 --mesh-size 300000 \
  --orthophoto-resolution 2.0 --dem-resolution 10 --skip-report
echo "ODM_RESUME_EXIT=$?"
ls -la /data/work/odm/asu/odm_texturing/ /data/work/odm/asu/odm_orthophoto/ 2>&1 | head -30
echo "RESUME_DONE"
"""

sb = modal.Sandbox.create(
    "bash", "-c", CMD,
    image=img, volumes={"/data": vol},
    timeout=10 * 3600, cpu=16, memory=65536, app=app,
)
print("SANDBOX:", sb.object_id)
