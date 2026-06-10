import * as THREE from "three";

export type OrbitTweenPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

type ActiveTween = {
  from: OrbitTweenPose;
  to: OrbitTweenPose;
  startMs: number;
  durationMs: number;
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export class OrbitCameraTweenRunner {
  private active: ActiveTween | null = null;

  isRunning() {
    return this.active !== null;
  }

  start(from: OrbitTweenPose, to: OrbitTweenPose, durationMs = 850) {
    this.active = {
      from: { position: from.position.clone(), target: from.target.clone() },
      to: { position: to.position.clone(), target: to.target.clone() },
      startMs: performance.now(),
      durationMs,
    };
  }

  cancel() {
    this.active = null;
  }

  step(
    nowMs: number,
    out: OrbitTweenPose,
  ): boolean {
    if (!this.active) return false;
    const raw = (nowMs - this.active.startMs) / this.active.durationMs;
    const t = easeInOutCubic(THREE.MathUtils.clamp(raw, 0, 1));
    out.position.lerpVectors(this.active.from.position, this.active.to.position, t);
    out.target.lerpVectors(this.active.from.target, this.active.to.target, t);
    if (raw >= 1) {
      out.position.copy(this.active.to.position);
      out.target.copy(this.active.to.target);
      this.active = null;
      return false;
    }
    return true;
  }
}
