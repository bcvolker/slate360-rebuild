"""Detail-survival trace: sharpness (variance of Laplacian, gray) at each stage we can touch locally."""
import sys, json, numpy as np
from PIL import Image, ImageFilter
S=sys.argv[1]; V=f"{S}/room213/views/images"
def lapvar(a):
    a=a.astype(np.float32); L=(-4*a + np.roll(a,1,0)+np.roll(a,-1,0)+np.roll(a,1,1)+np.roll(a,-1,1))[2:-2,2:-2]; return float(L.var())
def hf_ratio(a):
    f=np.abs(np.fft.fftshift(np.fft.fft2(a.astype(np.float32)-a.mean()))); h,w=f.shape; yy,xx=np.mgrid[:h,:w]; r=np.hypot(yy-h/2,xx-w/2)/(min(h,w)/2)
    tot=f.sum(); return float(f[r>0.25].sum()/tot)
stations=["000050","000100","000173","000250","000325"]
res={}
for st in stations:
    for v in range(16):
        im=Image.open(f"{V}/{st}_v{v:02d}.jpg").convert("L"); a=np.asarray(im)
        cls='horizon' if v<8 else ('up' if v<12 else 'down')
        for scale,label in ((1,'1280 crop (training res, steps>=6000)'),(2,'640 (steps 3000-5999)'),(4,'320 (steps 0-2999)')):
            b=np.asarray(im.resize((1280//scale,1280//scale), Image.BILINEAR)) if scale>1 else a
            res.setdefault(label,{}).setdefault(cls,[]).append(lapvar(b))
        res.setdefault('hf_energy_ratio_1280',{}).setdefault(cls,[]).append(hf_ratio(a))
for label,d in res.items():
    print(label, {k: round(float(np.median(v)),1) for k,v in d.items()})
# panel: GT | render H5 | render G5 | diff  (each 1280 wide)
for name in ["median_000173","best_000264","worst_000325"]:
    p=np.asarray(Image.open(f"C:/s360-recon-exp/qa/exp3-run/exp5-pull/panels/panels/{name}.png").convert("L"))
    w=p.shape[1]//4; gt=p[:, :w]; r1=p[:, w:2*w]; r2=p[:, 2*w:3*w]
    print(name, "panel", p.shape, "GT lapvar %.1f  render-H5 %.1f  render-G5 %.1f  ratio %.2f  hf GT %.3f render %.3f" % (lapvar(gt), lapvar(r1), lapvar(r2), lapvar(r1)/lapvar(gt), hf_ratio(gt), hf_ratio(r1)))
# JPEG quality / size of crops
import os
sz=[os.path.getsize(f"{V}/{st}_v{v:02d}.jpg") for st in stations for v in range(16)]
print("crop jpeg bytes median", int(np.median(sz)), "-> bits/pixel %.2f" % (np.median(sz)*8/1280/1280))
im=Image.open(f"{V}/000173_v00.jpg"); print("crop mode/size", im.mode, im.size, "quantization tables:", len(getattr(im,'quantization',{}) or {}), "q0[0:4]", (im.quantization or {}).get(0,[None])[:4] if hasattr(im,'quantization') else None)
