import pycolmap, numpy as np, json
r=pycolmap.Reconstruction('fc_sparse')
C={};Rm={}
for iid,im in r.images.items():
    cfw=im.cam_from_world(); R=np.asarray(cfw.rotation.matrix()); t=np.asarray(cfw.translation)
    C[iid]=-R.T@t; Rm[iid]=R
Cs=np.array(list(C.values()))
# vertical = normal of best-fit plane of camera centres
c0=Cs.mean(0); u,s,vt=np.linalg.svd(Cs-c0); up=vt[2]
X=np.array([p.xyz for p in r.points3D.values()]); err=np.array([p.error for p in r.points3D.values()]); tl=np.array([p.track.length() for p in r.points3D.values()])
h=(X-c0)@up
if np.median(h)>0: pass
print('sv',s.round(2),'up',up.round(3))
hist,edges=np.histogram(h,bins=120,range=(np.percentile(h,0.5),np.percentile(h,99.5)))
for a,b in zip(edges[:-1],hist): 
    if b>800: print(round(a,3),b)
json.dump({'c0':c0.tolist(),'up':up.tolist()},open('geom0.json','w'))
