"""Room 213 camera-model audit, part 1: pure pose/intrinsics checks on the frozen transforms.json."""
import json, sys, math
import numpy as np
from collections import defaultdict
S = sys.argv[1]
doc = json.load(open(f"{S}/room213/views/transforms.json"))
frames = doc["frames"]
print("camera_model", doc["camera_model"], "frames", len(frames))

# --- expected crop rotations (COLMAP convention) from the layout ---
VIEW_YAWS_HORIZON = (0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0)
VIEW_YAWS_TILT = (0.0, 90.0, 180.0, 270.0)
LAYOUT = [(y, 0.0) for y in VIEW_YAWS_HORIZON] + [(y, 45.0) for y in VIEW_YAWS_TILT] + [(y, -45.0) for y in VIEW_YAWS_TILT]

def expected_R_view_in_pano(yaw_deg, pitch_deg):
    # COLMAP EQUIRECTANGULAR CamRayFromImg forward; right = derivative wrt yaw; down = z x x
    y, p = math.radians(yaw_deg), math.radians(pitch_deg)
    z = np.array([math.cos(p)*math.sin(y), -math.sin(p), math.cos(p)*math.cos(y)])
    x = np.array([math.cos(y), 0.0, -math.sin(y)])   # +yaw direction (right), horizontal
    yv = np.cross(z, x)
    return np.stack([x, yv, z], axis=1)

# group by station
stations = defaultdict(dict)
for f in frames:
    name = f["file_path"].split("/")[-1]
    stem, v = name[:-4].split("_v")
    stations[stem][int(v)] = f
print("stations", len(stations), "views/station distribution", sorted(set(len(v) for v in stations.values())))

# intrinsics
keys = ("w","h","fl_x","fl_y","cx","cy","k1","k2","p1","p2")
intr = set(tuple(f[k] for k in keys) for f in frames)
print("distinct intrinsics tuples:", len(intr), intr)
fov = 2*math.degrees(math.atan(frames[0]["w"]/2/frames[0]["fl_x"]))
print("implied HFOV deg", round(fov,4))

# per station: centers, spread, rotation consistency
spreads=[]; rot_err=[]; rel_err=[]; det_err=[]; orth_err=[]
c_all=[]
for stem, views in sorted(stations.items()):
    Ms = {}
    for v,f in views.items():
        M = np.array(f["transform_matrix"], float)
        R_gl = M[:3,:3].copy(); C = M[:3,3]
        # undo nerfstudio OpenGL flip -> OpenCV c2w
        R_cv = R_gl.copy(); R_cv[:,1]*=-1; R_cv[:,2]*=-1
        Ms[v]=(R_cv, C)
        orth_err.append(np.abs(R_cv.T@R_cv-np.eye(3)).max()); det_err.append(abs(np.linalg.det(R_cv)-1))
    Cs = np.stack([Ms[v][1] for v in sorted(Ms)])
    spreads.append(np.linalg.norm(Cs - Cs.mean(0), axis=1).max())
    c_all.append(Cs.mean(0))
    # recover pano rotation from v00 (yaw0,pitch0): R_pano = R_v00 @ E(0,0)^T
    R_pano = Ms[0][0] @ expected_R_view_in_pano(0,0).T
    for v,(R_cv,C) in Ms.items():
        yaw,pitch = LAYOUT[v]
        R_exp = R_pano @ expected_R_view_in_pano(yaw,pitch)
        dR = R_exp.T @ R_cv
        ang = math.degrees(math.acos(max(-1,min(1,(np.trace(dR)-1)/2))))
        rot_err.append(ang)
    # relative rotation between crops v and v00 across stations should be identical
    for v,(R_cv,C) in Ms.items():
        rel = Ms[0][0].T @ R_cv
        rel_err.append((v, rel))
c_all=np.array(c_all)
print("within-station center spread: max %.3e  mean %.3e (world units)" % (max(spreads), np.mean(spreads)))
print("rotation orthonormality max err %.2e, det-1 max %.2e" % (max(orth_err), max(det_err)))
print("crop rotation vs expected layout: max %.4f deg, mean %.4f deg, >0.01deg count %d" % (max(rot_err), np.mean(rot_err), sum(e>0.01 for e in rot_err)))
# relative rotations fixed across stations?
byv=defaultdict(list)
for v,rel in rel_err: byv[v].append(rel)
mx=0
for v,rels in byv.items():
    ref=rels[0]
    for r in rels[1:]:
        d=ref.T@r; a=math.degrees(math.acos(max(-1,min(1,(np.trace(d)-1)/2)))); mx=max(mx,a)
print("max deviation of relative crop rotation (v vs v00) across all stations: %.2e deg" % mx)
# trajectory stats
d = np.linalg.norm(np.diff(c_all,axis=0),axis=1)
print("station count %d; consecutive-station baseline: median %.3f  mean %.3f  min %.3f  max %.3f" % (len(c_all), np.median(d), d.mean(), d.min(), d.max()))
bb = c_all.max(0)-c_all.min(0); print("trajectory bbox extents", np.round(bb,3), "diag %.3f" % np.linalg.norm(bb))
# up-axis sanity: pano Y (down) direction across stations
ups=[]
for stem,views in stations.items():
    R_cv,_=None,None
    M=np.array(views[0]["transform_matrix"],float); R=M[:3,:3].copy(); R[:,1]*=-1; R[:,2]*=-1
    R_pano = R @ expected_R_view_in_pano(0,0).T
    ups.append(R_pano[:,1])
ups=np.array(ups); mu=ups.mean(0); mu/=np.linalg.norm(mu)
tilt=np.degrees(np.arccos(np.clip(ups@mu,-1,1)))
print("pano 'down' axis consensus vector", np.round(mu,4), "; per-station tilt from consensus: median %.2f deg, p95 %.2f, max %.2f" % (np.median(tilt), np.percentile(tilt,95), tilt.max()))
json.dump({"stations":len(stations),"spread_max":float(max(spreads)),"rot_err_max_deg":float(max(rot_err)),"rel_rot_dev_max_deg":float(mx),"baseline_median":float(np.median(d)),"bbox":bb.tolist(),"tilt_p95":float(np.percentile(tilt,95))}, open(f"{S}/audit/geom_summary.json","w"), indent=1)
