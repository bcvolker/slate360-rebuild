/**
 * useViewportInsets — exposes iOS Safari / Android Chrome on-screen-keyboard
 * height so we can pad sticky inputs / footers above it.
 *
 * Returns 0 on the server and on browsers without visualViewport.
 */
"use client";

import { useEffect, useState } from "react";

export function useViewportInsets() {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;

    const update = () => {
      // The keyboard's effective height = layout viewport - visual viewport.
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return { keyboardOffset };
}
