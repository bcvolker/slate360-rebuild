r"""Convert COLMAP mesh_texturer output (mesh.ply + texture.png) -> web GLB.

COLMAP writes PER-FACE texcoords (property list uchar float texcoord = 6 floats
per triangle). glTF needs per-vertex UVs, so faces are un-indexed: every triangle
gets its own 3 vertices carrying their own UVs.

Texture atlas is 16384x6480 PNG (85 MB) -> downscaled + JPEG for the web. The
atlas is per-triangle patches, so we do NOT over-downscale (bleeding between
patches); 8192 wide keeps patch integrity.
"""
import modal

app = modal.App.lookup("slate360-glb2", create_if_missing=True)
img = (modal.Image.debian_slim(python_version="3.11")
       .apt_install("libgl1", "libglib2.0-0")
       .pip_install("trimesh", "numpy<2", "pillow"))
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
python3 - <<'PY'
import numpy as np, struct, os, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

P = '/data/work/mesh/textured/mesh.ply'
with open(P,'rb') as f:
    hdr = b''
    while not hdr.endswith(b'end_header\n'):
        hdr += f.read(1)
    txt = hdr.decode('ascii', 'ignore')
    nv = int([l for l in txt.splitlines() if l.startswith('element vertex')][0].split()[-1])
    nf = int([l for l in txt.splitlines() if l.startswith('element face')][0].split()[-1])
    print('verts', nv, 'faces', nf, flush=True)
    V = np.frombuffer(f.read(nv*12), dtype='<f4').reshape(nv,3).astype(np.float32)
    rest = f.read()

# faces: uchar count(3) + 3*int32 idx + uchar count(6) + 6*float32 uv
rec = np.dtype([('n1','u1'),('idx','<i4',3),('n2','u1'),('uv','<f4',6)])
F = np.frombuffer(rest[:nf*rec.itemsize], dtype=rec)
print('face rec ok:', (F['n1']==3).all(), (F['n2']==6).all(), flush=True)
idx = F['idx'].astype(np.int64)
uv  = F['uv'].reshape(nf,3,2).astype(np.float32)

# un-index: per-triangle vertices with their own UVs
VP = V[idx].reshape(-1,3)                      # (nf*3, 3)
VT = uv.reshape(-1,2).copy()
VT[:,1] = 1.0 - VT[:,1]                        # glTF UV origin is top-left
print('unindexed verts', len(VP), flush=True)
# no index buffer: glTF allows non-indexed primitives, and after un-indexing the
# index array would be a pointless 0..N-1 ramp costing ~10 MB.

# texture: downscale + JPEG (atlas is per-triangle patches -> avoid heavy downscale)
im = Image.open('/data/work/mesh/textured/texture.png').convert('RGB')
W = 8192
im2 = im.resize((W, max(1,int(im.height*W/im.width))), Image.LANCZOS)
im2.save('/data/work/mesh/textured/atlas.jpg', quality=88, optimize=True)
tb = open('/data/work/mesh/textured/atlas.jpg','rb').read()
print('atlas jpg', len(tb)//1024, 'KB', im2.size, flush=True)

def pad4(b): return b + b'\x00' * ((4 - len(b)%4) % 4)
bin_parts, views, accs = [], [], []
off = 0
def add(arr, target, comptype, typ, minmax=False):
    global off
    b = pad4(arr.tobytes())
    bin_parts.append(b)
    views.append({'buffer':0,'byteOffset':off,'byteLength':int(arr.nbytes)}
                 | ({'target':target} if target else {}))
    a = {'bufferView':len(views)-1,'componentType':comptype,'count':int(len(arr)),'type':typ}
    if minmax:
        a['min']=arr.min(axis=0).tolist(); a['max']=arr.max(axis=0).tolist()
    accs.append(a); off += len(b)
    return len(accs)-1

aPos = add(VP.astype('<f4'), 34962, 5126, 'VEC3', True)
aUV  = add(VT.astype('<f4'), 34962, 5126, 'VEC2')
imgView = len(views)
b = pad4(tb); bin_parts.append(b)
views.append({'buffer':0,'byteOffset':off,'byteLength':len(tb)}); off += len(b)

g = {'asset':{'version':'2.0','generator':'slate360 colmap mesh_texturer'},
 'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0}],
 'meshes':[{'primitives':[{'attributes':{'POSITION':aPos,'TEXCOORD_0':aUV},
                           'material':0}]}],
 'materials':[{'pbrMetallicRoughness':{'baseColorTexture':{'index':0},
               'metallicFactor':0.0,'roughnessFactor':1.0},'doubleSided':True}],
 'textures':[{'source':0,'sampler':0}],
 'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],
 'images':[{'bufferView':imgView,'mimeType':'image/jpeg'}],
 'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':off}]}

# glTF 2.0: JSON chunk pads with SPACES, BIN chunk pads with zeros. Padding the
# JSON with \x00 leaves NULs that make TextDecoder+JSON.parse throw.
jb = json.dumps(g, separators=(',',':')).encode()
jb = jb + b' ' * ((4 - len(jb) % 4) % 4)
bb = b''.join(bin_parts)
glb = (struct.pack('<4sII', b'glTF', 2, 12+8+len(jb)+8+len(bb))
       + struct.pack('<I4s', len(jb), b'JSON') + jb
       + struct.pack('<I4s', len(bb), b'BIN\x00') + bb)
out = '/data/work/mesh/coverage_textured.glb'
open(out,'wb').write(glb)
print('WROTE', out, len(glb)//1024//1024, 'MB', flush=True)
PY
echo "GLB_DONE"
ls -la /data/work/mesh/
"""

sb = modal.Sandbox.create("bash", "-c", CMD, image=img, volumes={"/data": vol},
                          timeout=2*3600, cpu=8, memory=65536, app=app)
print("SANDBOX:", sb.object_id)
