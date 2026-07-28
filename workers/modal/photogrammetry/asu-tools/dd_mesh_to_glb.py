r"""Convert the DroneDeploy textured mesh (scene_mesh_textured.obj + 4 JPEG
atlases) to a web GLB for the 3D tab, placed in the viewer's ENU frame.

- OBJ is site-local METERS (bbox ~136x122x42, XY centered near 0, Z up with an
  arbitrary offset). Same solve as the DD map, so axes are assumed parallel to
  ENU; only a translation is unknown. That translation is measured by
  rasterizing a textured nadir view of the mesh and phase-correlating it
  against the deck map (RGB-to-RGB -- the method that works).
- 4 usemtl groups -> 4 GLB primitives, one texture each (atlases downscaled to
  2048, JPEG q86).
- Output positions: ENU meters (x=east, y=north, z=up, deck plane ~z 0) --
  matches the viewer's existing mesh/camera conventions.
"""
import os

import cv2
import numpy as np

SRC = r"C:\ASU-Survey\models"
D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

# ---------- parse OBJ ----------
verts, uvs = [], []
groups = {}          # mat -> list of (vi, ti) triples per triangle
cur = None
with open(os.path.join(SRC, "scene_mesh_textured.obj")) as f:
    for line in f:
        if line.startswith("v "):
            p = line.split()
            verts.append((float(p[1]), float(p[2]), float(p[3])))
        elif line.startswith("vt "):
            p = line.split()
            uvs.append((float(p[1]), float(p[2])))
        elif line.startswith("usemtl"):
            cur = line.split()[1]
            groups.setdefault(cur, [])
        elif line.startswith("f "):
            p = line.split()[1:]
            tri = []
            for w in p[:3]:
                a = w.split("/")
                tri.append((int(a[0]) - 1, int(a[1]) - 1 if len(a) > 1 and a[1] else 0))
            groups[cur].append(tri)
V = np.array(verts, np.float32)
VT = np.array(uvs, np.float32)
print("verts %d uvs %d groups %s" % (len(V), len(VT), {k: len(v) for k, v in groups.items()}))
print("bbox", V.min(0), V.max(0))

# ---------- nadir textured render (local coords) for registration ----------
mats = sorted(groups.keys())
atlas = {}
for i, m in enumerate(mats):
    # key the atlas off the MATERIAL NAME (material_00..material_04), not the
    # enumeration index -- this export has 5 materials and enumerate order is
    # not guaranteed to match the file numbering.
    p = os.path.join(SRC, "scene_mesh_textured_%s_map_Kd.jpg" % m)
    atlas[m] = cv2.imread(p)
    print(m, "->", os.path.basename(p), atlas[m].shape)

GS = 0.10  # 10cm render
x0, y0 = V[:, 0].min(), V[:, 1].min()
W = int((V[:, 0].max() - x0) / GS) + 1
H = int((V[:, 1].max() - y0) / GS) + 1
img = np.zeros((H, W, 3), np.uint8)
zbuf = np.full((H, W), -1e9, np.float32)
for m in mats:
    A = atlas[m]
    AH, AW = A.shape[:2]
    tris = groups[m]
    for tri in tris:
        pts = np.array([[(V[vi][0] - x0) / GS, (V[vi][1] - y0) / GS] for vi, ti in tri])
        zs = [V[vi][2] for vi, ti in tri]
        ts = [VT[ti] for vi, ti in tri]
        xa, ya = int(pts[:, 0].min()), int(pts[:, 1].min())
        xb, yb = int(pts[:, 0].max()) + 1, int(pts[:, 1].max()) + 1
        if xb <= xa or yb <= ya or xb < 0 or yb < 0 or xa >= W or ya >= H:
            continue
        xa, ya = max(0, xa), max(0, ya)
        xb, yb = min(W, xb), min(H, yb)
        X0, Y0 = pts[0]; X1, Y1 = pts[1]; X2, Y2 = pts[2]
        den = (Y1 - Y2) * (X0 - X2) + (X2 - X1) * (Y0 - Y2)
        if abs(den) < 1e-9:
            continue
        gx, gy = np.meshgrid(np.arange(xa, xb) + 0.5, np.arange(ya, yb) + 0.5)
        l0 = ((Y1 - Y2) * (gx - X2) + (X2 - X1) * (gy - Y2)) / den
        l1 = ((Y2 - Y0) * (gx - X2) + (X0 - X2) * (gy - Y2)) / den
        l2 = 1 - l0 - l1
        msk = (l0 >= 0) & (l1 >= 0) & (l2 >= 0)
        if not msk.any():
            continue
        z = l0 * zs[0] + l1 * zs[1] + l2 * zs[2]
        sub = zbuf[ya:yb, xa:xb]
        msk &= z > sub
        if not msk.any():
            continue
        u = (l0 * ts[0][0] + l1 * ts[1][0] + l2 * ts[2][0])[msk]
        v = (l0 * ts[0][1] + l1 * ts[1][1] + l2 * ts[2][1])[msk]
        au = np.clip(u * (AW - 1), 0, AW - 1).astype(np.int32)
        av = np.clip((1 - v) * (AH - 1), 0, AH - 1).astype(np.int32)
        sub[msk] = z[msk].astype(np.float32)
        img[ya:yb, xa:xb][msk] = A[av, au]
img = img[::-1]  # north-up (row 0 = max y)
cv2.imwrite(os.path.join(OUT, "ddmesh_nadir.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
print("nadir render", img.shape)

# ---------- register nadir render to the deck map (RGB-to-RGB) ----------
ddmap = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
map10 = cv2.resize(ddmap[:, :, :3], (ddmap.shape[1] // 10, ddmap.shape[0] // 10),
                   interpolation=cv2.INTER_AREA)  # 10cm/px, frame x0=-66.66 y1=11.29
MH, MW = map10.shape[:2]
# pad/crop render into the map's canvas for correlation
canvas = np.zeros((MH, MW), np.float32)
g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
ch, cw = min(MH, g.shape[0]), min(MW, g.shape[1])
canvas[:ch, :cw] = g[:ch, :cw]
mg = cv2.cvtColor(map10, cv2.COLOR_BGR2GRAY).astype(np.float32)


def hp(a):
    return a - cv2.GaussianBlur(a, (0, 0), 8)


win = cv2.createHanningWindow((MW, MH), cv2.CV_32F)
(dx, dy), resp = cv2.phaseCorrelate(hp(mg), hp(canvas), win)
print("mesh->map shift (10cm px): dx=%.1f dy=%.1f resp=%.3f" % (dx, dy, resp))
# canvas col c corresponds to mesh x = x0 + c*GS ; map col c => frame x = -66.66 + c*0.10
# mesh content appears in map at (c - dx, r - dy) => mesh x0 maps to frame x:
FX0, FY1 = -66.66, 11.29
# mesh row0 (after flip) = max y (V[:,1].max())
mesh_ymax = V[:, 1].max()
east_off = (FX0 + (-dx) * 0.10) - x0          # ENU east of mesh x0... verify sign at check
north_off = (FY1 - (-dy) * 0.10) - mesh_ymax
print("provisional offsets: east %+.2f  north %+.2f (verify below)" % (east_off, north_off))

# verify: shift canvas by (dx,dy) and measure residual
M2 = np.float32([[1, 0, -dx], [0, 1, -dy]])
shifted = cv2.warpAffine(canvas, M2, (MW, MH))
(rdx, rdy), rresp = cv2.phaseCorrelate(hp(mg), hp(shifted), win)
print("residual after shift: (%.2f, %.2f) resp %.3f" % (rdx, rdy, rresp))

# ---------- build GLB (positions translated to ENU) ----------
V_enu = V.copy()
V_enu[:, 0] += east_off
V_enu[:, 1] += north_off
# z: keep relative, shift deck to ~0 using median of lower half
zmed = np.median(V[:, 2])
V_enu[:, 2] -= zmed
print("ENU bbox:", V_enu.min(0), V_enu.max(0))

# per-material indexed arrays keyed by (vi,ti)
import struct
import json as js

prims = []
bin_parts = []
views = []
accs = []
off = 0


def pad4(b, fill=b"\x00"):
    return b + fill * ((4 - len(b) % 4) % 4)


def add_buf(arr, target, ctype, atype, minmax=False):
    global off
    b = pad4(arr.tobytes())
    bin_parts.append(b)
    views.append({"buffer": 0, "byteOffset": off, "byteLength": int(arr.nbytes), "target": target})
    a = {"bufferView": len(views) - 1, "componentType": ctype, "count": int(len(arr)), "type": atype}
    if minmax:
        a["min"] = arr.min(0).tolist()
        a["max"] = arr.max(0).tolist()
    accs.append(a)
    off += len(b)
    return len(accs) - 1


images = []
textures = []
materials = []
for mi, m in enumerate(mats):
    tris = groups[m]
    remap = {}
    P, T2 = [], []
    I = []
    for tri in tris:
        for vi, ti in tri:
            k = (vi, ti)
            if k not in remap:
                remap[k] = len(P)
                P.append(V_enu[vi])
                uv = VT[ti]
                T2.append((uv[0], 1.0 - uv[1]))
            I.append(remap[k])
    P = np.array(P, np.float32)
    T2 = np.array(T2, np.float32)
    I = np.array(I, np.uint32)
    aP = add_buf(P, 34962, 5126, "VEC3", True)
    aT = add_buf(T2, 34962, 5126, "VEC2")
    aI = add_buf(I, 34963, 5125, "SCALAR")
    # texture: downscale to 2048
    A = atlas[m]
    s = 2048 / max(A.shape[:2])
    A2 = cv2.resize(A, (int(A.shape[1] * s), int(A.shape[0] * s)), interpolation=cv2.INTER_AREA) if s < 1 else A
    ok, jb = cv2.imencode(".jpg", A2, [cv2.IMWRITE_JPEG_QUALITY, 86])
    b = pad4(jb.tobytes())
    bin_parts.append(b)
    views.append({"buffer": 0, "byteOffset": off, "byteLength": len(jb)})
    off += len(b)
    images.append({"bufferView": len(views) - 1, "mimeType": "image/jpeg"})
    textures.append({"source": mi, "sampler": 0})
    materials.append({"pbrMetallicRoughness": {"baseColorTexture": {"index": mi},
                                               "metallicFactor": 0.0, "roughnessFactor": 1.0},
                      "doubleSided": True})
    prims.append({"attributes": {"POSITION": aP, "TEXCOORD_0": aT}, "indices": aI, "material": mi})
    print("prim %s: %d verts %d idx  tex %s" % (m, len(P), len(I), A2.shape))

g = {"asset": {"version": "2.0", "generator": "dd_mesh_to_glb"}, "scene": 0,
     "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
     "meshes": [{"primitives": prims}], "materials": materials,
     "textures": textures, "images": images,
     "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
     "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": off}]}
jb = pad4(js.dumps(g, separators=(",", ":")).encode(), b" ")
bb = b"".join(bin_parts)
glb = (struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(jb) + 8 + len(bb))
       + struct.pack("<I4s", len(jb), b"JSON") + jb
       + struct.pack("<I4s", len(bb), b"BIN\x00") + bb)
with open(os.path.join(D, "dd_mesh.glb"), "wb") as f:
    f.write(glb)
print("WROTE dd_mesh.glb %.1f MB" % (len(glb) / 1e6))
js.dump({"east_off": float(east_off), "north_off": float(north_off), "z_ref": float(zmed)},
        open(os.path.join(D, "dd_mesh_placement.json"), "w"))
