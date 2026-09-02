"use client";

import { useEffect, useState } from "react";

const KEY = "sw-look-hint-v1";

export function LookHint({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      if (window.localStorage.getItem(KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setShow(true);
  }, [active]);

  useEffect(() => {
    if (!show) return;
    const hide = () => {
      try {
        window.localStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
      setShow(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("pointerdown", hide, { once: true });
    window.addEventListener("wheel", hide, { once: true, passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  if (!show) return null;
  return (
    <p className="sw-look-hint" data-testid="sw-look-hint">
      Drag to look · Scroll to zoom · Click path to move
    </p>
  );
}
