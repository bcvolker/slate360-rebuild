/** Approximate 2D path→plan transform. Visual navigation only — not survey control. */

export type PlanControl = {
  pathX: number;
  pathY: number;
  planU: number;
  planV: number;
};

export type PlanFrame = {
  scale: number;
  rotationRad: number;
  tx: number;
  ty: number;
  rmse: number;
  controlCount: number;
  status: "unvalidated";
};

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function applyPlanFrame(frame: PlanFrame, pathX: number, pathY: number): { u: number; v: number } {
  const c = Math.cos(frame.rotationRad);
  const s = Math.sin(frame.rotationRad);
  return {
    u: frame.scale * (c * pathX - s * pathY) + frame.tx,
    v: frame.scale * (s * pathX + c * pathY) + frame.ty,
  };
}

export function solvePlanFrame(controls: PlanControl[]): PlanFrame | null {
  if (controls.length < 2) return null;
  if (controls.some((p) => ![p.pathX, p.pathY, p.planU, p.planV].every(Number.isFinite))) return null;

  const n = controls.length;
  const mx = controls.reduce((a, p) => a + p.pathX, 0) / n;
  const my = controls.reduce((a, p) => a + p.pathY, 0) / n;
  const mu = controls.reduce((a, p) => a + p.planU, 0) / n;
  const mv = controls.reduce((a, p) => a + p.planV, 0) / n;

  let sxx = 0;
  let syy = 0;
  let suu = 0;
  let svv = 0;
  let sxy = 0;
  let syx = 0;
  for (const p of controls) {
    const x = p.pathX - mx;
    const y = p.pathY - my;
    const u = p.planU - mu;
    const v = p.planV - mv;
    sxx += x * x;
    syy += y * y;
    suu += u * u;
    svv += v * v;
    sxy += x * u + y * v;
    syx += x * v - y * u;
  }
  const denom = sxx + syy;
  if (denom < 1e-12) return null;

  const scale = Math.sqrt((suu + svv) / denom);
  const rotationRad = Math.atan2(syx, sxy);
  const c = Math.cos(rotationRad);
  const s = Math.sin(rotationRad);
  const tx = mu - scale * (c * mx - s * my);
  const ty = mv - scale * (s * mx + c * my);
  const frame: PlanFrame = { scale, rotationRad, tx, ty, rmse: 0, controlCount: n, status: "unvalidated" };

  const sse = controls.reduce((acc, p) => {
    const q = applyPlanFrame(frame, p.pathX, p.pathY);
    return acc + dist(q.u, q.v, p.planU, p.planV) ** 2;
  }, 0);
  frame.rmse = Math.sqrt(sse / n);
  return frame;
}

export function pathPointsToPlan(frame: PlanFrame, points: Array<{ x: number; y: number }>) {
  return points.map((p) => applyPlanFrame(frame, p.x, p.y));
}
