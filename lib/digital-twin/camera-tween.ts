import * as THREE from "three";

export type CameraTweenTarget = {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
};

type ActiveTween = {
  from: CameraTweenTarget;
  to: CameraTweenTarget;
  startMs: number;
  durationMs: number;
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerpAngle(a: number, b: number, t: number) {
  const delta = THREE.MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI;
  return a + delta * t;
}

export class CameraTweenRunner {
  private active: ActiveTween | null = null;
  private readonly scratch: CameraTweenTarget = {
    position: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
  };

  isRunning() {
    return this.active !== null;
  }

  start(from: CameraTweenTarget, to: CameraTweenTarget, durationMs = 900) {
    this.active = {
      from: {
        position: from.position.clone(),
        yaw: from.yaw,
        pitch: from.pitch,
      },
      to: {
        position: to.position.clone(),
        yaw: to.yaw,
        pitch: to.pitch,
      },
      startMs: performance.now(),
      durationMs,
    };
  }

  cancel() {
    this.active = null;
  }

  /** Returns false when the tween completes. */
  step(nowMs: number, out: CameraTweenTarget): boolean {
    if (!this.active) return false;

    const raw = (nowMs - this.active.startMs) / this.active.durationMs;
    const t = easeInOutCubic(THREE.MathUtils.clamp(raw, 0, 1));

    out.position.lerpVectors(this.active.from.position, this.active.to.position, t);
    out.yaw = lerpAngle(this.active.from.yaw, this.active.to.yaw, t);
    out.pitch = THREE.MathUtils.lerp(this.active.from.pitch, this.active.to.pitch, t);

    if (raw >= 1) {
      out.position.copy(this.active.to.position);
      out.yaw = this.active.to.yaw;
      out.pitch = this.active.to.pitch;
      this.active = null;
      return false;
    }

    return true;
  }
}
