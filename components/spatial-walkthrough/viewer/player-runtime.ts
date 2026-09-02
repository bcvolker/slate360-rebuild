type Resizable = { resize: (size?: unknown) => void };

export function attachPlayerRuntime(args: {
  container: HTMLElement | null;
  viewer: { rotate: (pos: { yaw: number; pitch: number }) => void; getPosition: () => { yaw: number; pitch: number } } & Resizable;
  autoRotate: boolean;
  onTick: () => void;
}): () => void {
  const { container, viewer, autoRotate, onTick } = args;
  const resizeViewer = () => {
    if (!container) return;
    viewer.resize({ width: container.clientWidth, height: container.clientHeight });
  };
  window.addEventListener("resize", resizeViewer);
  const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => resizeViewer());
  if (container) ro?.observe(container);
  let spinning = autoRotate;
  const spin = window.setInterval(() => {
    if (!spinning) return;
    const pos = viewer.getPosition();
    viewer.rotate({ yaw: pos.yaw + (0.25 * Math.PI) / 180, pitch: pos.pitch });
  }, 80);
  const stopSpin = () => {
    spinning = false;
  };
  container?.addEventListener("pointerdown", stopSpin);
  const tick = window.setInterval(onTick, 350);
  resizeViewer();
  return () => {
    window.clearInterval(tick);
    window.clearInterval(spin);
    container?.removeEventListener("pointerdown", stopSpin);
    window.removeEventListener("resize", resizeViewer);
    ro?.disconnect();
  };
}
