import json, numpy as np, cv2, collections
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
LM=json.load(open('landmarks.json')); lms=LM['landmarks']; names=LM['names']
crops=np.load('../landmark_crops_v2.npz')
rows=json.load(open('loo_rows.json'))
pred={}
for tag in ('before','after'):
    for split in ('held','fit'):
        for r in rows[tag][split]: pred[(tag,r['pid'],r['iid'])]=(r['dx'],r['dy'],r['err'],split)
# ---- correspondence sheet: 2 held-out landmarks per class with >=4 obs
Z=3; T=96*Z; FONT=cv2.FONT_HERSHEY_SIMPLEX
lines=[]
by=collections.defaultdict(list)
for li,L in enumerate(lms):
    obs=[(-1,L['ref']['image_id'],L['ref']['xy'])]+[(mi,m['image_id'],m['xy']) for mi,m in enumerate(L['measurements']) if m.get('ok')]
    if len(obs)>=4 and ('before',L['pid'],obs[1][1]) in pred and pred[('before',L['pid'],obs[1][1])][3]=='held': by[L['cls']].append((li,L,obs))
for cls in ('carpet','ceiling','wall_baseboard','chair','table'):
    for li,L,obs in sorted(by[cls],key=lambda x:-len(x[2]))[:2]:
        tiles=[]
        for mi,iid,xy in obs[:6]:
            key=f'{li}_{mi}'
            if key not in crops: continue
            c=cv2.resize(crops[key],(T,T),interpolation=cv2.INTER_NEAREST); off=L['crop_off'][str(mi)]
            def P(p): return (int((p[0]-off[0]+0.5)*Z), int((p[1]-off[1]+0.5)*Z))
            cv2.drawMarker(c,P(xy),(0,255,0),cv2.MARKER_CROSS,18,1)
            lab=[]
            for tag,col in (('before',(0,0,255)),('after',(255,160,0))):
                q=pred.get((tag,L['pid'],iid))
                if q: cv2.circle(c,P((xy[0]+q[0],xy[1]+q[1])),5,col,1); lab.append(f"{'G' if tag=='before' else 'R'} {q[2]:.2f}")
            r=np.hypot(xy[0]-1920,xy[1]-1920)
            cv2.rectangle(c,(0,0),(T,30),(20,20,20),-1)
            cv2.putText(c,f"{names[str(iid)].split('/')[0][-1:]}:{names[str(iid)].split('_')[-1][:5]} r{int(r)} {'REF' if mi==-1 else ''}",(3,12),FONT,0.38,(255,255,255),1)
            cv2.putText(c,'  '.join(lab)+' px',(3,26),FONT,0.38,(255,255,255),1)
            tiles.append(c)
        while len(tiles)<6: tiles.append(np.full((T,T,3),30,np.uint8))
        head=np.full((T,150,3),20,np.uint8)
        disp={'ceiling':'ceiling-height','wall_baseboard':'wall band'}.get(cls,cls)
        for k,t in enumerate([disp,f"pid {L['pid']}",f"u{L['uvh'][0]:.1f} v{L['uvh'][1]:.1f}",f"h{L['uvh'][2]:.2f}"]): cv2.putText(head,t,(5,25+22*k),FONT,0.45,(255,255,255),1)
        lines.append(np.hstack([head]+tiles))
top=np.full((56,lines[0].shape[1],3),20,np.uint8)
cv2.putText(top,'Room 213 held-out landmark correspondences (native 3840 fisheye, 96x96 crops, nearest-neighbour x3). Green + = independent measurement.',(6,18),FONT,0.5,(255,255,255),1)
cv2.putText(top,'Red circle = GOLDEN camera leave-one-out prediction (G), orange circle = RIG-corrected prediction (R); numbers = error in native px. REF = template source view (also scored leave-one-out).',(6,40),FONT,0.5,(255,255,255),1)
bot=np.full((34,lines[0].shape[1],3),20,np.uint8); cv2.putText(bot,'AUDIT: rows labelled ceiling-height landed on window-head recesses and wall-band rows on a pole crossing a door (occlusion edge) - INVALID for those feature classes; carpet/chair/table rows are valid.',(6,22),FONT,0.47,(80,200,255),1)
cv2.imwrite('correspondence_sheet.png',np.vstack([top]+lines+[bot]))
# ---- before/after plots
H={t:np.array([r['err'] for r in rows[t]['held']]) for t in ('before','after')}
F={t:np.array([r['err'] for r in rows[t]['fit']]) for t in ('before','after')}
fig,ax=plt.subplots(1,3,figsize=(16,4.6))
for t,c in (('before','tab:red'),('after','tab:orange')):
    x=np.sort(H[t]); ax[0].plot(x,np.arange(1,len(x)+1)/len(x),c=c,label=f"HELD {'golden' if t=='before' else 'rig-corrected'} (median {np.median(x):.2f}, p95 {np.percentile(x,95):.2f})")
    x=np.sort(F[t]); ax[0].plot(x,np.arange(1,len(x)+1)/len(x),c=c,ls=':',label=f"FIT {'golden' if t=='before' else 'rig'} (median {np.median(x):.2f})")
ax[0].axvline(0.485,c='gray',ls='--',label='median annotation uncertainty 0.49'); ax[0].axvline(0.5,c='green',ls=':',label='target ~0.5 px')
ax[0].set_xlim(0,5); ax[0].set_xlabel('leave-one-out error, native px (3840 fisheye)'); ax[0].set_ylabel('CDF'); ax[0].legend(fontsize=7); ax[0].set_title('Held-out camera disagreement')
Hb=rows['before']['held']; Ha=rows['after']['held']
def medby(R,key,edges):
    out=[]
    for lo,hi in zip(edges[:-1],edges[1:]):
        e=[r['err'] for r in R if lo<=r[key]<hi]; out.append(np.median(e) if len(e)>=8 else np.nan)
    return out
ed=[0,400,800,1050,1300,1500,1700]; mid=[(a+b)/2 for a,b in zip(ed[:-1],ed[1:])]
ax[1].plot(mid,medby(Hb,'radius',ed),'o-',c='tab:red',label='golden'); ax[1].plot(mid,medby(Ha,'radius',ed),'s-',c='tab:orange',label='rig')
for L_,m in ((1,'^'),(2,'v')):
    ax[1].plot(mid,medby([r for r in Hb if r['lens']==L_],'radius',ed),m+'--',c='tab:red',alpha=.5,label=f'golden lens {L_}')
ax[1].set_xlabel('radius from fisheye centre (px)'); ax[1].set_ylabel('median held-out error (px)'); ax[1].legend(fontsize=7); ax[1].set_title('By radius / lens (bins n>=8)'); ax[1].set_ylim(0,3)
sp=[r['speed'] for r in Hb if np.isfinite(r['speed'])]; q=np.percentile(sp,[0,25,50,75,100]); q[-1]+=1e-9
ax[2].plot(range(4),medby(Hb,'speed',q),'o-',c='tab:red',label='golden'); ax[2].plot(range(4),medby(Ha,'speed',q),'s-',c='tab:orange',label='rig')
ax[2].set_xticks(range(4)); ax[2].set_xticklabels([f'Q{k+1}' for k in range(4)]); ax[2].set_xlabel('camera speed quartile (exposure-to-exposure)'); ax[2].set_ylim(0,3); ax[2].legend(fontsize=7); ax[2].set_title('By motion')
plt.tight_layout(); plt.savefig('heldout_before_after.png',dpi=110)
print('ok')
