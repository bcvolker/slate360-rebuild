import numpy as np, json, re, sys
from scipy.spatial.transform import Rotation as R
P="../dd/src/sparse/0/images.txt"
cams={}
for ln in open(P):
    if ln.startswith('#') or not ln.strip(): continue
    t=ln.split()
    if len(t)<10 or not t[9].startswith('camera'): continue
    q=[float(x) for x in t[1:5]]; tr=np.array([float(x) for x in t[5:8]])
    m=re.match(r'camera(\d)/frame_(\d+)_(\w+)\.png',t[9]); lens,fi,role=int(m[1]),int(m[2]),m[3]
    Rw2c=R.from_quat([q[1],q[2],q[3],q[0]]).as_matrix()
    cams.setdefault(fi,{})[lens]=(Rw2c,tr,role)
print('exposures',len(cams),'with both lenses',sum(1 for v in cams.values() if len(v)==2))
rel=[];rows=[]
for fi,v in sorted(cams.items()):
    if len(v)<2: continue
    R0,t0,_=v[1];R1,t1,_=v[2]
    Rr=R1@R0.T; tr=t1-Rr@t0       # x_c1 = Rr x_c0 + tr
    C0=-R0.T@t0; C1=-R1.T@t1
    rel.append((fi,Rr,tr,C0,C1))
Rs=R.from_matrix([r[1] for r in rel]); Rm=Rs.mean()
ang=np.degrees((Rs*Rm.inv()).magnitude())
base=np.array([np.linalg.norm(r[3]-r[4]) for r in rel])
tdir=np.array([r[2]/np.linalg.norm(r[2]) for r in rel]); tm=np.median(tdir,0); tm/=np.linalg.norm(tm)
dang=np.degrees(np.arccos(np.clip(tdir@tm,-1,1)))
# consecutive exposure motion
C0s=np.array([r[3] for r in rel]); fis=np.array([r[0] for r in rel])
print('mean rel rot angle deg', round(Rm.magnitude()*57.2958,3))
for nm,a in [('rel-rot deviation from mean (deg)',ang),('baseline |C1-C0| (units)',base),('baseline direction deviation (deg)',dang)]:
    print(nm, 'median',round(np.median(a),4),'p90',round(np.percentile(a,90),4),'max',round(a.max(),4),'std',round(a.std(),4))
print('baseline CV',round(base.std()/base.mean(),3))
# pixel equivalent at fisheye: f~1075 px/rad -> deg*18.8 px
print('rel-rot deviation in px (f=1075 px/rad): median',round(np.radians(np.median(ang))*1075,2),'p90',round(np.radians(np.percentile(ang,90))*1075,2))
json.dump({'fi':fis.tolist(),'rotDevDeg':ang.tolist(),'baseline':base.tolist(),'baseDirDevDeg':dang.tolist(),'C0':C0s.tolist()},open('rig_consistency.json','w'))
