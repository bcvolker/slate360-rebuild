r"""Re-render ONLY the deck frame from the textured mesh, at 1 cm/px.

The full-extent 2 cm render proved the texturing works (no seams, no tonal
polygons). This restricts the raster to the viewer's deck frame so the same
pixel budget buys 1 cm GSD -- filling pyramid level L3 (12135x8133) with real
detail instead of an upsample of L2.

Deck frame == viewer MESH frame == thermal v5 ENU extent:
    x -66.66 .. 54.69 m,  y -70.04 .. 11.29 m
"""
import modal

app = modal.App.lookup("slate360-orthomesh", create_if_missing=True)
img = modal.Image.debian_slim(python_version="3.11").pip_install("numpy<2", "pillow")
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
python3 - <<'PY'
import numpy as np, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

with open('/data/work/mesh/textured/mesh.ply','rb') as f:
    hdr=b''
    while not hdr.endswith(b'end_header\n'): hdr += f.read(1)
    t=hdr.decode('ascii','ignore')
    nv=int([l for l in t.splitlines() if l.startswith('element vertex')][0].split()[-1])
    nf=int([l for l in t.splitlines() if l.startswith('element face')][0].split()[-1])
    V=np.frombuffer(f.read(nv*12),dtype='<f4').reshape(nv,3).astype(np.float64)
    rest=f.read()
rec=np.dtype([('n1','u1'),('idx','<i4',3),('n2','u1'),('uv','<f4',6)])
F=np.frombuffer(rest[:nf*rec.itemsize],dtype=rec)
idx=F['idx'].astype(np.int64); uvf=F['uv'].reshape(nf,3,2).astype(np.float64)
atl=np.asarray(Image.open('/data/work/mesh/textured/texture.png').convert('RGB'))
AH,AW=atl.shape[:2]

GSD=0.01
X0,Y0,X1,Y1 = -66.66, -70.04, 54.69, 11.29
W=int(round((X1-X0)/GSD)); H=int(round((Y1-Y0)/GSD))
print('deck canvas',W,H,flush=True)

col=np.zeros((H,W,3),np.uint8); zbuf=np.full((H,W),-1e9,np.float32)
T=V[idx]
px=(T[:,:,0]-X0)/GSD; py=(Y1-T[:,:,1])/GSD; pz=T[:,:,2]
au=uvf[:,:,0]*(AW-1); av=(1.0-uvf[:,:,1])*(AH-1)

# drop triangles fully outside the deck frame before rasterising
keep=~((px.max(1)<0)|(px.min(1)>W-1)|(py.max(1)<0)|(py.min(1)>H-1))
sel=np.nonzero(keep)[0]
print('tris in frame',len(sel),'of',nf,flush=True)

lo_x=np.clip(np.floor(px.min(1)).astype(np.int32),0,W-1)
hi_x=np.clip(np.ceil (px.max(1)).astype(np.int32),0,W-1)
lo_y=np.clip(np.floor(py.min(1)).astype(np.int32),0,H-1)
hi_y=np.clip(np.ceil (py.max(1)).astype(np.int32),0,H-1)

for c,i in enumerate(sel):
    xa,xb=lo_x[i],hi_x[i]; ya,yb=lo_y[i],hi_y[i]
    if xb<xa or yb<ya: continue
    A0,B0=px[i,0],py[i,0]; A1,B1=px[i,1],py[i,1]; A2,B2=px[i,2],py[i,2]
    den=(B1-B2)*(A0-A2)+(A2-A1)*(B0-B2)
    if abs(den)<1e-12: continue
    gx,gy=np.meshgrid(np.arange(xa,xb+1)+0.5, np.arange(ya,yb+1)+0.5)
    l0=((B1-B2)*(gx-A2)+(A2-A1)*(gy-B2))/den
    l1=((B2-B0)*(gx-A2)+(A0-A2)*(gy-B2))/den
    l2=1.0-l0-l1
    m=(l0>=-1e-6)&(l1>=-1e-6)&(l2>=-1e-6)
    if not m.any(): continue
    z=l0*pz[i,0]+l1*pz[i,1]+l2*pz[i,2]
    sub=zbuf[ya:yb+1,xa:xb+1]
    m&=z>sub
    if not m.any(): continue
    u=np.clip(l0*au[i,0]+l1*au[i,1]+l2*au[i,2],0,AW-1)[m]
    v=np.clip(l0*av[i,0]+l1*av[i,1]+l2*av[i,2],0,AH-1)[m]
    sub[m]=z[m].astype(np.float32)
    col[ya:yb+1,xa:xb+1][m]=atl[v.astype(np.int32),u.astype(np.int32)]
    if c%100000==0: print('tri',c,flush=True)

print('coverage %.1f%%'%(100*(zbuf>-1e8).mean()),flush=True)
Image.fromarray(col).save('/data/work/mesh/deck_ortho_1cm.jpg',quality=93,optimize=True)
np.save('/data/work/mesh/deck_dem_1cm.npy', zbuf)
json.dump({'gsd':GSD,'x0':X0,'y0':Y0,'x1':X1,'y1':Y1,'w':W,'h':H},
          open('/data/work/mesh/deck_ortho_1cm_meta.json','w'))
print('WROTE deck_ortho_1cm.jpg',flush=True)
PY
ls -la /data/work/mesh/deck_ortho_1cm*
echo "DECK1CM_DONE"
"""

sb = modal.Sandbox.create("bash", "-c", CMD, image=img, volumes={"/data": vol},
                          timeout=4*3600, cpu=8, memory=65536, app=app)
print("SANDBOX:", sb.object_id)
