"""Insta360 X4 factory Mei/unified camera model, as recovered from the .insv trailer
(protobuf field 54 of the metadata record; see ROOM213_RAW_RIG_PREFLIGHT doc).

String layout (per lens, 19 tokens after the leading lens count):
  xi fx fy cx cy  yaw pitch roll  tx ty tz  k1 k2 k3 p1 p2  W H F
Canvas: W=16000 x H=6000, lens A occupies x in [0,8000), lens B x in [8000,16000).
Projection follows OpenCV omnidir (Mei): X_s = X/|X|; m = (x_s/(z_s+xi), y_s/(z_s+xi));
radial k1..k3 + tangential p1,p2 on m; u = fx*m_x + cx, v = fy*m_y + cy.
Frame mapping (3840x3840 lens stream) = canvas pixels scaled by s and offset (ox, oy):
  u_f = s*(u - 8000*[lens B]) - ox, v_f = s*v - oy.  s/ox/oy are the ONLY quantities
this module estimates (2D similarity crop convention); no Mei parameter is refined here.
"""
from __future__ import annotations

import math

import numpy as np

MEI_STR = ("2_1.948170_4627.110_4626.190_4010.120_3003.090_-0.325_0.211_89.628_0.000000_0.000000_0.000000_"
           "0.37879178_1.43848073_-4.27699137_0.00124575_-0.00176244_16000_6000_71_"
           "1.948170_4602.810_4602.930_12003.110_3006.370_0.136_0.283_90.296_-0.001115_0.000149_-0.032238_"
           "0.37512687_1.36600089_-4.03310871_-0.00114169_0.00024372_16000_6000_71_197632")
OFFSET_STR = ("2_2899.960_4001.900_3007.050_-0.230_0.359_89.666_0.000000_0.000000_0.000000_1.00000000_-0.21946084_"
              "0.36187863_-0.13249248_16000_6000_71_2882.970_12003.730_3004.220_0.097_0.357_90.250_0.001366_0.001355_"
              "-0.032259_1.00000000_-0.21340746_0.35219479_-0.12904812_16000_6000_71_132096")


def parse_mei(s: str = MEI_STR) -> list[dict]:
    t = s.split("_"); n = int(t[0]); t = t[1:]; out = []
    for i in range(n):
        v = t[i * 19:(i + 1) * 19]
        out.append({"xi": float(v[0]), "fx": float(v[1]), "fy": float(v[2]), "cx": float(v[3]), "cy": float(v[4]),
                    "yaw_deg": float(v[5]), "pitch_deg": float(v[6]), "roll_deg": float(v[7]),
                    "t_m": [float(v[8]), float(v[9]), float(v[10])],
                    "k1": float(v[11]), "k2": float(v[12]), "k3": float(v[13]), "p1": float(v[14]), "p2": float(v[15]),
                    "canvas_w": int(v[16]), "canvas_h": int(v[17]), "f_field": int(v[18]), "canvas_x_offset": 8000 * i})
    return out


def parse_offset(s: str = OFFSET_STR) -> list[dict]:
    t = s.split("_"); n = int(t[0]); t = t[1:]; out = []
    for i in range(n):
        v = t[i * 16:(i + 1) * 16]
        out.append({"r": float(v[0]), "cx": float(v[1]), "cy": float(v[2]), "yaw_deg": float(v[3]), "pitch_deg": float(v[4]),
                    "roll_deg": float(v[5]), "t_m": [float(v[6]), float(v[7]), float(v[8])],
                    "q_or_extra": [float(v[9]), float(v[10]), float(v[11]), float(v[12])],
                    "canvas_w": int(v[13]), "canvas_h": int(v[14]), "f_field": int(v[15]), "canvas_x_offset": 8000 * i})
    return out


class MeiLens:
    def __init__(self, p: dict, s: float = 0.727, ox: float = 0.0, oy: float = 0.0):
        self.p = p; self.s = s; self.ox = ox; self.oy = oy
        self.rho2_max = 1.0 / (p["xi"] ** 2 - 1.0)  # valid unprojection domain (xi>1)

    def project_canvas(self, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        p = self.p
        Xs = X / np.linalg.norm(X, axis=-1, keepdims=True)
        den = Xs[..., 2] + p["xi"]
        xs = Xs[..., 0] / den; ys = Xs[..., 1] / den
        r2 = xs * xs + ys * ys
        rad = 1 + p["k1"] * r2 + p["k2"] * r2 ** 2 + p["k3"] * r2 ** 3
        xd = xs * rad + 2 * p["p1"] * xs * ys + p["p2"] * (r2 + 2 * xs * xs)
        yd = ys * rad + p["p1"] * (r2 + 2 * ys * ys) + 2 * p["p2"] * xs * ys
        u = p["fx"] * xd + p["cx"] - p["canvas_x_offset"]; v = p["fy"] * yd + p["cy"]
        valid = (den > 0) & (r2 < self.rho2_max)
        return np.stack([u, v], -1), valid

    def project_frame(self, X: np.ndarray):
        uv, valid = self.project_canvas(X)
        return uv * self.s - np.array([self.ox, self.oy]), valid

    def unproject_frame(self, uv_f: np.ndarray, iters: int = 12) -> tuple[np.ndarray, np.ndarray]:
        """Newton inverse of the distortion (2x2 Jacobian per point; radial lookup as the
        initial guess -- the factory k-terms are large enough that fixed-point iteration
        diverges beyond ~0.4 rad), then the unit-sphere lift."""
        p = self.p
        uv = (uv_f + np.array([self.ox, self.oy])) / self.s
        xd = (uv[..., 0] - (p["cx"] - p["canvas_x_offset"])) / p["fx"]; yd = (uv[..., 1] - p["cy"]) / p["fy"]
        k1, k2, k3, p1, p2 = p["k1"], p["k2"], p["k3"], p["p1"], p["p2"]
        ru = np.linspace(0, 0.75, 4000); rd = ru * (1 + k1 * ru**2 + k2 * ru**4 + k3 * ru**6)
        mono = np.maximum.accumulate(rd); rdm = np.hypot(xd, yd)
        r0 = np.interp(rdm, mono, ru); sc = np.where(rdm > 1e-12, r0 / np.maximum(rdm, 1e-12), 1.0)
        xs, ys = xd * sc, yd * sc
        for _ in range(iters):
            r2 = xs * xs + ys * ys
            rad = 1 + k1 * r2 + k2 * r2**2 + k3 * r2**3
            g = k1 + 2 * k2 * r2 + 3 * k3 * r2**2  # d(rad)/d(r2)
            fx_ = xs * rad + 2 * p1 * xs * ys + p2 * (r2 + 2 * xs * xs) - xd
            fy_ = ys * rad + p1 * (r2 + 2 * ys * ys) + 2 * p2 * xs * ys - yd
            J11 = rad + xs * g * 2 * xs + 2 * p1 * ys + p2 * 6 * xs
            J12 = xs * g * 2 * ys + 2 * p1 * xs + p2 * 2 * ys
            J21 = ys * g * 2 * xs + p1 * 2 * xs + 2 * p2 * ys
            J22 = rad + ys * g * 2 * ys + p1 * 6 * ys + 2 * p2 * xs
            det = J11 * J22 - J12 * J21; det = np.where(np.abs(det) < 1e-12, 1e-12, det)
            xs = xs - (J22 * fx_ - J12 * fy_) / det; ys = ys - (-J21 * fx_ + J11 * fy_) / det
        rho2 = xs * xs + ys * ys
        disc = 1 + rho2 * (1 - p["xi"] ** 2)
        valid = disc >= 0
        z = (-rho2 * p["xi"] + np.sqrt(np.clip(disc, 0, None))) / (rho2 + 1)
        X = np.stack([xs * (z + p["xi"]), ys * (z + p["xi"]), z], -1)
        return X, valid


def euler_deg_to_R(yaw: float, pitch: float, roll: float) -> np.ndarray:
    # documented convention unknown; ZYX (yaw about y? ) -- used only for reporting, never for faces
    y, p, r = map(math.radians, (yaw, pitch, roll))
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(p), -math.sin(p)], [0, math.sin(p), math.cos(p)]])
    Rz = np.array([[math.cos(r), -math.sin(r), 0], [math.sin(r), math.cos(r), 0], [0, 0, 1]])
    return Ry @ Rx @ Rz
