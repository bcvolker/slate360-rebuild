/**
 * Dump the locked fridge camera in three.js and inverse-SIM3 (X4) form.
 */
import * as THREE from "three";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const FLOOR_Y = -1.5951639883678779;
const EYE = 1.6;
const POS = [0.72, FLOOR_Y + EYE, -1.7];
const YAW = -0.85;
const PITCH = 0;
const VFOV = 72;
const WIDTH = 1440;
const HEIGHT = 900;
const NEAR = 0.06;
const FAR = 60;
const ASPECT = WIDTH / HEIGHT;

const SIM3_S = 0.6300199669353641;
const SIM3_T = [
  [-0.5514738399579077, -0.07556614821619709, 0.29511272392610444, 1.7746585458241406],
  [0.08226644891394562, -0.6245950038221509, -0.0062025253513112505, 0.0318557059591983],
  [0.29331551947076806, 0.03310584814518766, 0.5565924609563254, -2.4350940320597885],
];

const cam = new THREE.PerspectiveCamera(VFOV, ASPECT, NEAR, FAR);
cam.position.set(POS[0], POS[1], POS[2]);
cam.rotation.set(PITCH, YAW, 0, "YXZ");
cam.updateMatrixWorld(true);
cam.updateProjectionMatrix();

const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
const target = cam.position.clone().add(forward);
const hfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(VFOV / 2)) * ASPECT));

const R = new THREE.Matrix3();
R.set(
  SIM3_T[0][0] / SIM3_S, SIM3_T[0][1] / SIM3_S, SIM3_T[0][2] / SIM3_S,
  SIM3_T[1][0] / SIM3_S, SIM3_T[1][1] / SIM3_S, SIM3_T[1][2] / SIM3_S,
  SIM3_T[2][0] / SIM3_S, SIM3_T[2][1] / SIM3_S, SIM3_T[2][2] / SIM3_S,
);
const Rt = R.clone().transpose();
const t = new THREE.Vector3(SIM3_T[0][3], SIM3_T[1][3], SIM3_T[2][3]);
const posX4 = cam.position.clone().sub(t).applyMatrix3(Rt).multiplyScalar(1 / SIM3_S);
const qA = cam.quaternion.clone();
const mR = new THREE.Matrix4().setFromMatrix3(Rt);
const qR = new THREE.Quaternion().setFromRotationMatrix(mR);
const qX4 = qR.clone().multiply(qA);

const c2wA = cam.matrixWorld.clone();
const w2cGl = c2wA.clone().invert();
const flip = new THREE.Matrix4().makeScale(1, -1, -1);
const viewCv = flip.multiply(w2cGl);

const fy = (0.5 * HEIGHT) / Math.tan(THREE.MathUtils.degToRad(VFOV / 2));
const fx = fy;
const cx = (WIDTH - 1) / 2;
const cy = (HEIGHT - 1) / 2;

const camX4 = new THREE.PerspectiveCamera(VFOV, ASPECT, NEAR, FAR);
camX4.position.copy(posX4);
camX4.quaternion.copy(qX4);
camX4.updateMatrixWorld(true);
const w2cGlX4 = camX4.matrixWorld.clone().invert();
const viewCvX4 = new THREE.Matrix4().makeScale(1, -1, -1).multiply(w2cGlX4);

const out = {
  id: "fridge-forensics",
  note: "Human-eye fridge station. three.js PerspectiveCamera vfov. Never change mid-comparison.",
  viewport: { width: WIDTH, height: HEIGHT },
  arkit: {
    position: cam.position.toArray(),
    quaternion_xyzw: cam.quaternion.toArray(),
    euler_YXZ_rad: [PITCH, YAW, 0],
    target: target.toArray(),
    vfov_deg: VFOV,
    hfov_deg: hfov,
    aspect: ASPECT,
    near: NEAR,
    far: FAR,
    matrixWorld: c2wA.toArray(),
    view_opencv: viewCv.toArray(),
  },
  x4: {
    position: posX4.toArray(),
    quaternion_xyzw: qX4.toArray(),
    view_opencv: viewCvX4.toArray(),
  },
  K: [
    [fx, 0, cx],
    [0, fy, cy],
    [0, 0, 1],
  ],
  sim3: { scale: SIM3_S, t: t.toArray() },
};

const destDir = path.join("docs", "ops", "twin-appearance-forensics");
mkdirSync(destDir, { recursive: true });
const dest = path.join(destDir, "CAMERA.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ position: out.arkit.position, vfov: VFOV, hfov, fx, fy }, null, 2));
