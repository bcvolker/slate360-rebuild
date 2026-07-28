r"""Orthographic top-down render of the COLMAP-textured mesh -> 2D orthophoto.

This is the replacement for the hand-rolled winner-take-all + border-offset
blender that produced the tonal-polygon artifacts. The texture atlas was baked by
`colmap mesh_texturer`, which does proper view selection + seam levelling, so a
straight nadir render of it inherits that blending instead of re-introducing
per-footprint illumination discontinuities.

Pure-numpy z-buffered triangle rasteriser (no GL in the container). Per-triangle
bbox loop; ~800k tris.
"""
import modal

app = modal.App.lookup("slate360-orthomesh", create_if_missing=True)
img = (modal.Image.debian_slim(python_version="3.11")
       .pip_install("numpy<2", "pillow"))
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
python3 - <<'PY'
import numpy as np, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

P = '/data/work/mesh/textured/mesh.ply'
with open(P,'rb') as f:
    hdr=b''
    while not hdr.endswith(b'end_header\n'): hdr += f.read(1)
    t = hdr.decode('ascii','ignore')
    nv = int([l for l in t.splitlines() if l.startswith('element vertex')][0].split()[-1])
    nf = int([l for l in t.splitlines() if l.startswith('element face')][0].split()[-1])
    V  = np.frombuffer(f.read(nv*12), dtype='<f4').reshape(nv,3).astype(np.float64)
    rest = f.read()
rec = np.dtype([('n1','u1'),('idx','<i4',3),('n2','u1'),('uv','<f4',6)])
F = np.frombuffer(rest[:nf*rec.itemsize], dtype=rec)
idx = F['idx'].astype(np.int64); uvf = F['uv'].reshape(nf,3,2).astype(np.float64)

atl = np.asarray(Image.open('/data/work/mesh/textured/texture.png').convert('RGB'))
AH, AW = atl.shape[:2]
print('atlas', atl.shape, 'tris', nf, flush=True)

GSD = 0.02
x0,y0 = V[:,0].min(), V[:,1].min()
x1,y1 = V[:,0].max(), V[:,1].max()
W = int(np.ceil((x1-x0)/GSD)); H = int(np.ceil((y1-y0)/GSD))
print('canvas', W, H, 'bounds', x0,y0,x1,y1, flush=True)

col = np.zeros((H,W,3), np.uint8)
zbuf = np.full((H,W), -1e9, np.float32)

T = V[idx]                                   # (nf,3,3)
# pixel-space vertex coords; +Y world is UP so flip rows
px = (T[:,:,0]-x0)/GSD
py = (y1-T[:,:,1])/GSD
pz = T[:,:,2]
au = uvf[:,:,0]*(AW-1)
av = (1.0-uvf[:,:,1])*(AH-1)

lo_x = np.floor(px.min(1)).astype(np.int32); hi_x = np.ceil(px.max(1)).astype(np.int32)
lo_y = np.floor(py.min(1)).astype(np.int32); hi_y = np.ceil(py.max(1)).astype(np.int32)
np.clip(lo_x,0,W-1,out=lo_x); np.clip(hi_x,0,W-1,out=hi_x)
np.clip(lo_y,0,H-1,out=lo_y); np.clip(hi_y,0,H-1,out=hi_y)

drawn=0
for i in range(nf):
    xa,xb = lo_x[i], hi_x[i]; ya,yb = lo_y[i], hi_y[i]
    if xb<xa or yb<ya: continue
    X0,Y0 = px[i,0],py[i,0]; X1,Y1 = px[i,1],py[i,1]; X2,Y2 = px[i,2],py[i,2]
    den = (Y1-Y2)*(X0-X2)+(X2-X1)*(Y0-Y2)
    if abs(den) < 1e-12: continue
    xs = np.arange(xa,xb+1)+0.5; ys = np.arange(ya,yb+1)+0.5
    gx,gy = np.meshgrid(xs,ys)
    l0 = ((Y1-Y2)*(gx-X2)+(X2-X1)*(gy-Y2))/den
    l1 = ((Y2-Y0)*(gx-X2)+(X0-X2)*(gy-Y2))/den
    l2 = 1.0-l0-l1
    m = (l0>=-1e-6)&(l1>=-1e-6)&(l2>=-1e-6)
    if not m.any(): continue
    z = l0*pz[i,0]+l1*pz[i,1]+l2*pz[i,2]
    sub = zbuf[ya:yb+1, xa:xb+1]
    m &= z > sub
    if not m.any(): continue
    u = (l0*au[i,0]+l1*au[i,1]+l2*au[i,2])[m]
    v = (l0*av[i,0]+l1*av[i,1]+l2*av[i,2])[m]
    np.clip(u,0,AW-1,out=u); np.clip(v,0,AH-1,out=v)
    sub[m] = z[m].astype(np.float32)
    col[ya:yb+1, xa:xb+1][m] = atl[v.astype(np.int32), u.astype(np.int32)]
    drawn+=1
    if i % 100000 == 0: print('tri', i, flush=True)

print('drawn', drawn, 'coverage %.1f%%' % (100*(zbuf>-1e8).mean()), flush=True)
Image.fromarray(col).save('/data/work/mesh/ortho_mesh.jpg', quality=93, optimize=True)
np.save('/data/work/mesh/ortho_mesh_dem.npy', zbuf)
json.dump({'gsd':GSD,'x0':x0,'y0':y0,'x1':x1,'y1':y1,'w':W,'h':H},
          open('/data/work/mesh/ortho_mesh_meta.json','w'))
print('WROTE ortho_mesh.jpg', flush=True)
PY
ls -la /data/work/mesh/
echo "ORTHO_DONE"
"""

sb = modal.Sandbox.create("bash", "-c", CMD, image=img, volumes={"/data": vol},
                          timeout=4*3600, cpu=8, memory=65536, app=app)
print("SANDBOX:", sb.object_id)
