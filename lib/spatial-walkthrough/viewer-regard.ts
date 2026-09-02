import { clampViewToRegard, fieldOfRegardAt } from "./field-of-regard";
import { operatorKeyframesFromRaw } from "./housewalk-operator";
import type { OperatorPatch } from "./types";

type SphereViewer = {
  getPosition: () => { yaw: number; pitch: number };
  rotate: (pos: { yaw: number; pitch: number }) => void;
  addEventListener: (name: string, fn: () => void) => void;
  removeEventListener: (name: string, fn: () => void) => void;
};

export function attachRegardGuard(
  viewer: SphereViewer,
  getTime: () => number,
  live: () => { restrictView: boolean; operatorPatch: OperatorPatch | null },
): () => void {
  const onPos = () => {
    const state = live();
    if (!state.restrictView) return;
    const pos = viewer.getPosition();
    const next = clampViewToRegard(
      (pos.yaw * 180) / Math.PI,
      (pos.pitch * 180) / Math.PI,
      fieldOfRegardAt(getTime(), operatorKeyframesFromRaw(state.operatorPatch), state.operatorPatch),
    );
    if (!next.clamped) return;
    viewer.rotate({ yaw: (next.yaw * Math.PI) / 180, pitch: (next.pitch * Math.PI) / 180 });
  };
  viewer.addEventListener("position-updated", onPos);
  return () => viewer.removeEventListener("position-updated", onPos);
}
