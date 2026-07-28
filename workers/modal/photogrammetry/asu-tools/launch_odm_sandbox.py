"""Run ODM in a Modal Sandbox with the UNMODIFIED container image (no
add_python injection — that's what broke the function-based runs: Modal's
interpreter shadowed ODM's own environment).

Creates a detached sandbox (survives this process), prints the sandbox id.
Check later:  python check_odm_sandbox.py <id>
"""
import modal

app = modal.App.lookup("slate360-odm-sb", create_if_missing=True)
# the ODM image's ENTRYPOINT is its own run.sh -> our bash command became
# ODM arguments ("unrecognized arguments: -c"). Clear it.
img = modal.Image.from_registry("opendronemap/odm:3.5.4").dockerfile_commands(
    ["ENTRYPOINT []"])
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
set -x
mkdir -p /data/work/odm/asu/images
n=$(ls /data/work/odm/asu/images | wc -l)
if [ "$n" -lt 900 ]; then
  find /data/images -path '*DJI_*' -name '*.JPG' | while read f; do
    cp -n "$f" /data/work/odm/asu/images/;
  done
fi
echo "IMAGES: $(ls /data/work/odm/asu/images | wc -l)"
python3 /code/run.py --project-path /data/work/odm asu \
  --orthophoto-resolution 1.0 --dsm --dem-resolution 2.0 \
  --mesh-size 600000 --mesh-octree-depth 11 \
  --pc-quality high --feature-quality high \
  --max-concurrency 16 --skip-report --gltf
echo "ODM_EXIT: $?"
ls -la /data/work/odm/asu/odm_orthophoto/ /data/work/odm/asu/odm_texturing/ || true
"""

sb = modal.Sandbox.create(
    "bash", "-c", CMD,
    image=img,
    volumes={"/data": vol},
    timeout=23 * 3600,
    cpu=16,
    memory=98304,
    app=app,
)
print("SANDBOX:", sb.object_id)
