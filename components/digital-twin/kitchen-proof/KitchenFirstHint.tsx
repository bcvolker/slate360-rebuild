"use client";

import { useEffect, useState, type ReactElement } from "react";

export function KitchenFirstHint({
  visible,
  onUsed,
}: {
  visible: boolean;
  onUsed: () => void;
}): ReactElement | null {
  const [show, setShow] = useState(visible);
  useEffect(() => {
    if (!visible) setShow(false);
  }, [visible]);
  if (!show) return null;
  return (
    <p
      className="pointer-events-none absolute bottom-[5.5rem] left-1/2 z-20 -translate-x-1/2 kv-hint px-3 py-2 text-center"
      data-testid="kitchen-first-hint"
      onAnimationEnd={onUsed}
    >
      Drag to look · Click floor to walk · Scroll to zoom
    </p>
  );
}
