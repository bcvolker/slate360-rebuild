import pycolmap, numpy as np, json
g=json.load(open('geom0.json')); c0=np.array(g['c0']); up=np.array(g['up'])
if up[1]>0: up=-up
r=pycolmap.Reconstruction('fc_sparse')
pids=np.array(list(r.points3D.keys())); X=np.array([r.points3D[p].xyz for p in pids])
h=(X-c0)@up
e1=np.cross(up,[0,0,1.]); e1/=np.linalg.norm(e1); e2=np.cross(up,e1)
P=np.stack([(X-c0)@e1,(X-c0)@e2],1)
mid=(h>-1.75)&(h<0.45)
best=None
for th in np.radians(np.arange(0,90,0.5)):
    d=np.array([np.cos(th),np.sin(th)]); q=P[mid]@d; q2=P[mid]@np.array([-d[1],d[0]])
    s=sum((np.histogram(v,bins=400)[0]**2).sum() for v in (q,q2))
    if best is None or s>best[0]: best=(s,th)
th=best[1]; a1=np.cos(th)*e1+np.sin(th)*e2; a2=np.cross(up,a1)
u=(X-c0)@a1; v=(X-c0)@a2
print('theta',np.degrees(th))
for nm,q in [('u',u[mid]),('v',v[mid])]:
    hist,ed=np.histogram(q,bins=200,range=(np.percentile(q,0.2),np.percentile(q,99.8)))
    pk=[(round(ed[i],2),hist[i]) for i in range(len(hist)) if hist[i]>np.percentile(hist,97)]
    print(nm,'range',round(q.min(),2),round(q.max(),2),'peaks',pk)
json.dump({'c0':c0.tolist(),'up':up.tolist(),'a1':a1.tolist(),'a2':a2.tolist()},open('geom.json','w'))
np.save('pts_uvh.npy',np.stack([pids,u,v,h],1))
