"""Bounded camera correction (ONE model): the golden free solve re-expressed as a RIGID two-lens rig.
- one Rig: sensor camera1 = reference, sensor camera2 = ONE shared sensor_from_rig (init: mean golden relative pose);
- one Frame per physical exposure (121), rig_from_world init = golden lens-1 pose;
- shared per-lens OPENCV_FISHEYE intrinsics (focal + k1..k4 refined, principal point fixed, as in the golden mapper);
- no per-frame intrinsics, no crop warps, no homographies.
Fitted on the golden SIFT tracks + FIT-landmark independent measurements only. HELD-OUT landmarks never enter.
Writes corrected cameras to <out>/ (COLMAP binary)."""
import json, re, sys
import numpy as np
import pycolmap
from scipy.spatial.transform import Rotation as Rot


def build_rig(src: pycolmap.Reconstruction, extra=None):
    extra = extra or []
    ext_by_img = {}
    for li, L in enumerate(extra):
        for iid, xy in L["obs"]:
            ext_by_img.setdefault(iid, []).append((li, xy))
    ext_idx = {}
    rec = pycolmap.Reconstruction()
    for cam in src.cameras.values():
        rec.add_camera(cam)
    by_expo = {}
    for iid, im in src.images.items():
        e = int(re.search(r"frame_(\d+)", im.name)[1]); by_expo.setdefault(e, {})[int(im.name[6])] = iid
    rels = []
    for e, d in by_expo.items():
        a = src.images[d[1]].cam_from_world(); b = src.images[d[2]].cam_from_world()
        rels.append(b * a.inverse())
    Rm = Rot.from_matrix([np.asarray(r.rotation.matrix()) for r in rels]).mean()
    tm = np.median([np.asarray(r.translation) for r in rels], 0)
    s2_from_s1 = pycolmap.Rigid3d(pycolmap.Rotation3d(Rm.as_matrix()), tm)
    rig = pycolmap.Rig(rig_id=1)
    rig.add_ref_sensor(pycolmap.sensor_t(pycolmap.SensorType.CAMERA, 1))
    rig.add_sensor(pycolmap.sensor_t(pycolmap.SensorType.CAMERA, 2), s2_from_s1)
    rec.add_rig(rig)
    for e, d in sorted(by_expo.items()):
        fr = pycolmap.Frame(); fr.frame_id = e + 1; fr.rig_id = 1
        for L, iid in d.items():
            fr.add_data_id(pycolmap.data_t(pycolmap.sensor_t(pycolmap.SensorType.CAMERA, L), iid))
        fr.rig_from_world = src.images[d[1]].cam_from_world()
        rec.add_frame(fr)
        for L, iid in d.items():
            s = src.images[iid]
            pts = [pycolmap.Point2D(p.xy) for p in s.points2D]
            for li, xy in ext_by_img.get(iid, []):
                ext_idx.setdefault(li, []).append((iid, len(pts))); pts.append(pycolmap.Point2D(np.array(xy, float)))
            im = pycolmap.Image(name=s.name, points2D=pycolmap.Point2DList(pts),
                                camera_id=s.camera_id, image_id=iid)
            im.frame_id = e + 1
            rec.add_image(im)
    for pid, p in src.points3D.items():
        tr = pycolmap.Track()
        for el in p.track.elements:
            tr.add_element(el.image_id, el.point2D_idx)
        rec.add_point3D(p.xyz, tr, p.color)
    for li, L in enumerate(extra):
        tr = pycolmap.Track()
        for iid, k in ext_idx.get(li, []):
            tr.add_element(iid, k)
        rec.add_point3D(np.array(L["X"], float), tr, np.zeros(3, np.uint8))
    return rec, rels


def main(src_dir, out_dir, fit_json=None):
    src = pycolmap.Reconstruction(src_dir)
    extra = []
    if fit_json:   # FIT-landmark independent measurements appended as extra observations + points
        for L in json.load(open(fit_json)):
            extra.append({"obs": [(m["image_id"], m["xy"]) for m in L["obs"]], "X": L["X"]})
    rec, rels = build_rig(src, extra)
    print("rig reconstruction:", rec.summary())
    before = rec.compute_mean_reprojection_error()
    opts = pycolmap.BundleAdjustmentOptions()
    opts.refine_focal_length = True; opts.refine_extra_params = True; opts.refine_principal_point = False
    opts.refine_sensor_from_rig = True; opts.refine_rig_from_world = True
    cfg = pycolmap.BundleAdjustmentConfig()
    for iid in rec.images: cfg.add_image(iid)
    cfg.fix_gauge(pycolmap.BundleAdjustmentGauge.THREE_POINTS)
    try:
        opts.ceres.solver_options.max_num_iterations = 200
    except Exception:
        pass
    ba = pycolmap.create_default_bundle_adjuster(opts, cfg, rec)
    summ = ba.solve()
    after = rec.compute_mean_reprojection_error()
    print("mean reproj before (rig init) / after:", before, after)
    import os
    os.makedirs(out_dir, exist_ok=True); rec.write(out_dir)
    return before, after


if __name__ == "__main__":
    main(*sys.argv[1:])
