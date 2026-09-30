"""Re-seed C (non-metric iPhone SfM) -> official ref from the D1 anchors: the 5 iPhone photos registered jointly with A (metric,
aligned to ref) give 5 camera-centre + orientation correspondences. Seed = similarity from those (rotation from the averaged
orientation difference, scale+translation from centres), then the same trimmed-similarity ICP as align_cond.py."""
import json, numpy as np, pycolmap
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation as Rot
A=pycolmap.Reconstruction('Asparse'); X=pycolmap.Reconstruction('D1sparse'); Cr=pycolmap.Reconstruction('Csparse')
key=lambda n:n[:-4] if n.endswith('.jpg') and 'x4stills' not in n else n
P=lambda r:{key(i.name):(np.asarray(i.cam_from_world().rotation.matrix()),np.asarray(i.cam_from_world().translation)) for i in r.images.values()}
pa,px=P(A),P(X); common=[n for n in pa if n in px]
Ca=np.array([-pa[n][0].T@pa[n][1] for n in common]); Cx=np.array([-px[n][0].T@px[n][1] for n in common])
def umeyama(X_, Y_):
    mx, my = X_.mean(0), Y_.mean(0); U, S, Vt = np.linalg.svd((Y_ - my).T @ (X_ - mx)); D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
    Rr = U @ D @ Vt; sc = np.trace(np.diag(S) @ D) / ((X_ - mx) ** 2).sum(); return sc, Rr, my - sc * Rr @ mx
s1,R1,t1=umeyama(Cx,Ca)                                  # D1 -> A
al=json.load(open("A_align.json"))["cond_to_ref"]; sA,RA,tA=al["s"],np.array(al["R"]),np.array(al["t"])
cby={i.name.split("/")[-1]:i for i in Cr.images.values()}; src,dst,rots=[],[],[]
for im in X.images.values():
    if "x4stills" not in im.name: continue
    c=np.asarray(im.projection_center()); cref=sA*RA@(s1*R1@c+t1)+tA
    c2w_ref=RA@R1@np.asarray(im.cam_from_world().rotation.matrix()).T
    ci=cby[im.name.split("/")[-1]]; src.append(np.asarray(ci.projection_center())); dst.append(cref)
    rots.append(c2w_ref@np.asarray(ci.cam_from_world().rotation.matrix()))       # maps C world -> ref world
Rs=Rot.from_matrix(np.array(rots)); R0=Rs.mean().as_matrix(); print("anchor rotation spread deg",np.round(np.degrees((Rs*Rs.mean().inv()).magnitude()),2))
src,dst=np.array(src),np.array(dst); s0=np.linalg.norm(dst-dst.mean(0),axis=1).sum()/np.linalg.norm((src-src.mean(0))@R0.T,axis=1).sum(); t0=dst.mean(0)-s0*R0@src.mean(0)
print("seed anchor residuals m",np.round(np.linalg.norm((s0*(R0@src.T)).T+t0-dst,axis=1),3),"scale",round(s0,3))
Q=np.array([q.xyz for q in Cr.points3D.values() if q.error<1.5]); Rf=np.array([q.xyz for q in pycolmap.Reconstruction("../p5/refsparse").points3D.values() if q.error<1.5])
tree=cKDTree(Rf); s,Rm,t=s0,R0,t0; log=[]
for thr in [0.3,0.2,0.12,0.08,0.05,0.04,0.03,0.03]:
    d,idx=tree.query((s*(Rm@Q.T)).T+t); sel=d<thr
    s,Rm,t=umeyama(Q[sel],Rf[idx[sel]]); log.append((thr,int(sel.sum()),round(float(np.median(d[sel])),4)))
d,_=tree.query((s*(Rm@Q.T)).T+t); print(log); print("frac<3cm %.2f <5cm %.2f <10cm %.2f median %.3f"%((d<.03).mean(),(d<.05).mean(),(d<.1).mean(),np.median(d)))
print("anchor residuals after ICP m",np.round(np.linalg.norm((s*(Rm@src.T)).T+t-dst,axis=1),3))
g=json.load(open("../p5/golden_to_ref_similarity.json")); sg,Rg,tg=g["s"],np.array(g["R"]),np.array(g["t"])
json.dump({"method":"D1 anchors + ICP","icp":log,"cond_to_ref":{"s":float(s),"R":Rm.tolist(),"t":t.tolist()},
           "cond_to_golden":{"s":float(s/sg),"R":(Rg.T@Rm).tolist(),"t":(Rg.T@(t-tg)/sg).tolist()}},open("C_align.json","w"),indent=1)
