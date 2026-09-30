"""Align a condition that contains A's frames: seed = similarity from shared A-image camera centres (cond -> A) composed with
A's verified A -> ref fit, then the same trimmed-similarity ICP. Usage: python align_via_A.py <sparse> <out.json>"""
import json, sys, numpy as np, pycolmap
from scipy.spatial import cKDTree
key=lambda n:n[:-4] if n.endswith('.jpg') else n
A=pycolmap.Reconstruction("Asparse"); X=pycolmap.Reconstruction(sys.argv[1])
ca={key(i.name):np.asarray(i.projection_center()) for i in A.images.values()}; cx={key(i.name):np.asarray(i.projection_center()) for i in X.images.values()}
c=[n for n in ca if n in cx]; Pa=np.array([ca[n] for n in c]); Px=np.array([cx[n] for n in c])
def umeyama(X_, Y_):
    mx, my = X_.mean(0), Y_.mean(0); U, S, Vt = np.linalg.svd((Y_ - my).T @ (X_ - mx)); D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
    Rr = U @ D @ Vt; sc = np.trace(np.diag(S) @ D) / ((X_ - mx) ** 2).sum(); return sc, Rr, my - sc * Rr @ mx
s1,R1,t1=umeyama(Px,Pa); r1=np.linalg.norm((s1*(R1@Px.T)).T+t1-Pa,axis=1); print("shared",len(c),"cond->A residual median %.4f p95 %.4f"%(np.median(r1),np.percentile(r1,95)))
a=json.load(open("A_align.json"))["cond_to_ref"]; sA,RA,tA=a["s"],np.array(a["R"]),np.array(a["t"])
s,Rm,t=sA*s1,RA@R1,sA*RA@t1+tA
Q=np.array([q.xyz for q in X.points3D.values() if q.error<1.5]); Rf=np.array([q.xyz for q in pycolmap.Reconstruction("../p5/refsparse").points3D.values() if q.error<1.5])
tree=cKDTree(Rf); log=[]
for thr in [0.2,0.12,0.08,0.05,0.04,0.03,0.03]:
    d,idx=tree.query((s*(Rm@Q.T)).T+t); sel=d<thr; s,Rm,t=umeyama(Q[sel],Rf[idx[sel]]); log.append((thr,int(sel.sum()),round(float(np.median(d[sel])),4)))
d,_=tree.query((s*(Rm@Q.T)).T+t); print(log); print("frac<3cm %.2f <5cm %.2f median %.3f"%((d<.03).mean(),(d<.05).mean(),np.median(d)))
g=json.load(open("../p5/golden_to_ref_similarity.json")); sg,Rg,tg=g["s"],np.array(g["R"]),np.array(g["t"])
json.dump({"method":"shared A cameras + ICP","icp":log,"cond_to_ref":{"s":float(s),"R":Rm.tolist(),"t":t.tolist()},
           "cond_to_golden":{"s":float(s/sg),"R":(Rg.T@Rm).tolist(),"t":(Rg.T@(t-tg)/sg).tolist()}},open(sys.argv[2],"w"),indent=1)
