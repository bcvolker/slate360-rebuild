import { VisibleRangePlugin } from "@photo-sphere-viewer/visible-range-plugin";
import { allowedVisibleRange, clampViewToRegard, fieldOfRegardAt, presentationRegard } from "./field-of-regard";
import { HOUSEWALK_OPERATOR_KEYFRAMES, operatorKeyframesFromRaw } from "./housewalk-operator";
import type { OperatorPatch } from "./types";

type SphereViewer = {
  getPlugin: (plugin: unknown) => {
    setHorizontalRange: (range: [string, string] | null) => void;
    setVerticalRange: (range: [string, string] | null) => void;
  } | null;
  getPosition: () => { yaw: number; pitch: number };
  animate: (opts: { yaw: string; pitch: string; speed: string }) => void;
};

export function applyVisibleRange(
  viewer: SphereViewer,
  t: number,
  restrict: boolean,
  patch: OperatorPatch | null,
  dragging: boolean,
): void {
  const plugin = viewer.getPlugin(VisibleRangePlugin);
  if (!plugin) return;
  if (!restrict) {
    plugin.setHorizontalRange(null);
    plugin.setVerticalRange(null);
    return;
  }
  if (dragging) return;
  const keys = operatorKeyframesFromRaw(patch);
  const regard = fieldOfRegardAt(t, keys.length ? keys : HOUSEWALK_OPERATOR_KEYFRAMES, patch);
  const range = allowedVisibleRange(regard);
  if (!range) {
    plugin.setHorizontalRange(null);
    plugin.setVerticalRange(["42deg", "78deg"]);
    return;
  }
  plugin.setHorizontalRange(range.horizontal);
  plugin.setVerticalRange(range.vertical);
  const pos = viewer.getPosition();
  const next = clampViewToRegard((pos.yaw * 180) / Math.PI, (pos.pitch * 180) / Math.PI, presentationRegard(regard));
  if (next.clamped) {
    const floor = Number.parseFloat(range.vertical[0]);
    viewer.animate({
      yaw: `${next.yaw}deg`,
      pitch: `${Math.max(next.pitch, Number.isFinite(floor) ? floor : 18)}deg`,
      speed: "4rpm",
    });
  }
}

export function attachVisibleRangeSync(
  viewer: SphereViewer,
  getTime: () => number,
  live: () => { restrictView: boolean; operatorPatch: OperatorPatch | null },
  container: HTMLElement | null,
): () => void {
  let dragging = false;
  const sync = () => {
    const state = live();
    applyVisibleRange(viewer, getTime(), state.restrictView, state.operatorPatch, dragging);
  };
  const onDown = () => {
    dragging = true;
  };
  const onUp = () => {
    dragging = false;
    sync();
  };
  container?.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  const tick = window.setInterval(sync, 450);
  sync();
  return () => {
    window.clearInterval(tick);
    window.removeEventListener("pointerup", onUp);
    container?.removeEventListener("pointerdown", onDown);
  };
}
