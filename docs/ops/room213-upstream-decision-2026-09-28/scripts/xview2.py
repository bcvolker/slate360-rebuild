import numpy as np, cv2, pycolmap, json
rec=pycolmap.Reconstruction('../p1/fc_sparse'); by={im.name:im for im in rec.images.values()}
G=960; sc=3840/G; gy,gx=np.mgrid[0:G,0:G].astype(float)
pix=np.stack([(gx+.5)*sc-.5,(gy+.5)*sc-.5],-1).reshape(-1,2); rr=np.hypot(pix[:,0]-1920,pix[:,1]-1920)
g=json.load(open('../p1/geom.json')); up=np.array(g['up'])
def load(n):
    im=by[n]; cam=rec.cameras[im.camera_id]; t=n.replace('/','_').replace('.png','')
    r=np.load(f'guide/guide/{t}_range_scaled.npy').reshape(-1); nm=cv2.cvtColor(cv2.imread(f'guide/guide/{t}_normal.png'),cv2.COLOR_BGR2RGB).reshape(-1,3).astype(float)
    ok=(nm.sum(1)>0)&(r>0)&(rr<1800); nrm=nm/127.5-1
    d=np.asarray(cam.cam_from_img(pix)); d=np.concatenate([d,np.ones((len(d),1))],1); d/=np.linalg.norm(d,axis=1,keepdims=True)
    cfw=im.cam_from_world(); R=np.asarray(cfw.rotation.matrix()); t_=np.asarray(cfw.translation); C=-R.T@t_
    return dict(im=im,cam=cam,r=r,ok=ok,n=nrm,d=d,R=R,t=t_,C=C)
def xcheck(a,b):
    A=load(a);B=load(b)
    X=A['C']+(A['d']@A['R'])*A['r'][:,None]; X=X[A['ok']]; nA=(A['n']@A['R'])[A['ok']]
    Xc=X@B['R'].T+B['t']; front=Xc[:,2]>0.1
    p=np.full((len(X),2),-1.0); p[front]=np.asarray(B['cam'].img_from_cam(Xc[front]))
    gi=(p[:,1]/sc).astype(int); gj=(p[:,0]/sc).astype(int); inb=front&(gi>=0)&(gj>=0)&(gi<G)&(gj<G)
    k=gi[inb]*G+gj[inb]; okb=B['ok'][k]
    rB=B['r'][k][okb]; dist=np.linalg.norm(X[inb][okb]-B['C'],axis=1)
    rel=(rB-dist)/dist
    vis=np.abs(rel)<0.25   # ignore occlusion changes
    nB=(B['n']@B['R'])[k][okb]; same=np.abs(rel)<0.05; ang=np.degrees(np.arccos(np.clip((nA[inb][okb][same]*nB[same]).sum(1),-1,1)))
    print(f'{a} -> {b}: overlap px {okb.sum()}, rel depth diff median {np.median(rel[vis]):+.3f}, |rel| median {np.median(np.abs(rel[vis])):.3f}, p90 {np.percentile(np.abs(rel[vis]),90):.3f}, frac>5% {(np.abs(rel)>0.05).mean():.2f} | same-surface(|rel|<5%) px {same.sum()} world-normal disagreement median {np.median(ang):.1f} deg p90 {np.percentile(ang,90):.1f}')
for a,b in [('camera1/frame_00037.png','camera1/frame_00060.png'),('camera2/frame_00104.png','camera1/frame_00060.png'),('camera1/frame_00036.png','camera1/frame_00037.png'),('camera2/frame_00103.png','camera2/frame_00104.png'),('camera2/frame_00103.png','camera1/frame_00103.png'),('camera1/frame_00036.png','camera1/frame_00060.png')]:
    try: xcheck(a,b)
    except Exception as e: print(a,b,'ERR',e)
