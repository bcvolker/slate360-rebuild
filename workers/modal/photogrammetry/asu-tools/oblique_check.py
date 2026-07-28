r"""Oblique renders of the decimated mesh -- the honest check on the thing Brian
has rejected three times ("floaters, spikes, missing detail").

The nadir ortho can look perfect while the geometry is still spiky, because a
top-down z-buffer hides vertical artefacts. This renders the same mesh from two
oblique angles with the photo ortho draped by world-XY UV (exactly what the
viewer's shader does) so what comes out is what Brian will see on the TERRAIN
tab.
"""
import modal

app = modal.App.lookup("slate360-orthomesh", create_if_missing=True)
img = modal.Image.debian_slim(python_version="3.11").pip_install("numpy<2", "pillow")
vol = modal.Volume.from_name("asu-rgb-flights")

CMD = r"""
python3 - <<'PY'
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

with open('/data/work/mesh/textured/mesh.ply','rb') as f:
    hdr=b''
    while not hdr.endswith(b'end_header\n'): hdr+=f.read(1)
    t=hdr.decode('ascii','ignore')
    nv=int([l for l in t.splitlines() if l.startswith('element vertex')][0].split()[-1])
    nf=int([l for l in t.splitlines() if l.startswith('element face')][0].split()[-1])
    V=np.frombuffer(f.read(nv*12),dtype='<f4').reshape(nv,3).astype(np.float64)
    rest=f.read()
rec=np.dtype([('n1','u1'),('idx','<i4',3),('n2','u1'),('uv','<f4',6)])
F=np.frombuffer(rest[:nf*rec.itemsize],dtype=rec)
idx=F['idx'].astype(np.int64)

# drape the deck ortho by world XY (same as the viewer shader)
ortho=np.asarray(Image.open('/data/work/mesh/deck_ortho_1cm.jpg').convert('RGB'))
OH,OW=ortho.shape[:2]
X0,Y0,X1,Y1=-66.66,-70.04,54.69,11.29

# restrict to the deck neighbourhood so the stadium bowl doesn't dominate
cen=V[idx].mean(1)
sel=np.nonzero((cen[:,0]>X0-15)&(cen[:,0]<X1+15)&
               (cen[:,1]>Y0-15)&(cen[:,1]<Y1+15))[0]
print('tris near deck',len(sel),flush=True)

cx,cy=(X0+X1)/2,(Y0+Y1)/2
zc=np.median(V[:,2])

def render(az_deg, el_deg, W=1500, H=1000, name='obl.jpg'):
    az=np.radians(az_deg); el=np.radians(el_deg)
    # camera basis: right, up, forward(view dir)
    fwd=np.array([np.cos(el)*np.cos(az), np.cos(el)*np.sin(az), -np.sin(el)])
    right=np.array([-np.sin(az), np.cos(az), 0.0])
    up=np.cross(right,fwd)
    org=np.array([cx,cy,zc])
    P=(V-org)
    u=P@right; v=P@up; d=P@fwd          # orthographic oblique
    span=115.0
    sx=(u/span+0.5)*W
    sy=(0.5-v/(span*H/W))*H            # square pixels: y span scaled by aspect
    col=np.zeros((H,W,3),np.uint8); zb=np.full((H,W),1e9,np.float32)
    px=sx[idx]; py=sy[idx]; pd=d[idx]
    wx=V[idx][:,:,0]; wy=V[idx][:,:,1]
    lo_x=np.clip(np.floor(px.min(1)).astype(np.int32),0,W-1)
    hi_x=np.clip(np.ceil (px.max(1)).astype(np.int32),0,W-1)
    lo_y=np.clip(np.floor(py.min(1)).astype(np.int32),0,H-1)
    hi_y=np.clip(np.ceil (py.max(1)).astype(np.int32),0,H-1)
    for i in sel:
        xa,xb=lo_x[i],hi_x[i]; ya,yb=lo_y[i],hi_y[i]
        if xb<xa or yb<ya: continue
        A0,B0=px[i,0],py[i,0]; A1,B1=px[i,1],py[i,1]; A2,B2=px[i,2],py[i,2]
        den=(B1-B2)*(A0-A2)+(A2-A1)*(B0-B2)
        if abs(den)<1e-12: continue
        gx,gy=np.meshgrid(np.arange(xa,xb+1)+0.5,np.arange(ya,yb+1)+0.5)
        l0=((B1-B2)*(gx-A2)+(A2-A1)*(gy-B2))/den
        l1=((B2-B0)*(gx-A2)+(A0-A2)*(gy-B2))/den
        l2=1.0-l0-l1
        m=(l0>=-1e-6)&(l1>=-1e-6)&(l2>=-1e-6)
        if not m.any(): continue
        z=l0*pd[i,0]+l1*pd[i,1]+l2*pd[i,2]
        sub=zb[ya:yb+1,xa:xb+1]
        m&=z<sub
        if not m.any(): continue
        gwx=l0*wx[i,0]+l1*wx[i,1]+l2*wx[i,2]
        gwy=l0*wy[i,0]+l1*wy[i,1]+l2*wy[i,2]
        ou=np.clip((gwx-X0)/(X1-X0)*(OW-1),0,OW-1)[m]
        ov=np.clip((Y1-gwy)/(Y1-Y0)*(OH-1),0,OH-1)[m]
        sub[m]=z[m].astype(np.float32)
        col[ya:yb+1,xa:xb+1][m]=ortho[ov.astype(np.int32),ou.astype(np.int32)]
    Image.fromarray(col).save('/data/work/mesh/'+name,quality=92)
    print('wrote',name,'cover %.1f%%'%(100*(zb<1e8).mean()),flush=True)

render(35, 32, name='oblique_a.jpg')
render(215, 28, name='oblique_b.jpg')
PY
ls -la /data/work/mesh/oblique_*.jpg
echo "OBLIQUE_DONE"
"""

sb = modal.Sandbox.create("bash", "-c", CMD, image=img, volumes={"/data": vol},
                          timeout=2*3600, cpu=8, memory=49152, app=app)
print("SANDBOX:", sb.object_id)
