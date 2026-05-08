"use client";

import { useEffect, useState } from "react";

export function useVirtualKeyboardOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function updateOffset() {
      const activeViewport = window.visualViewport;
      if (!activeViewport) return;
      const nextOffset = Math.max(0, Math.round(window.innerHeight - activeViewport.height - activeViewport.offsetTop));
      setOffset(nextOffset > 24 ? nextOffset : 0);
    }

    updateOffset();
    viewport.addEventListener("resize", updateOffset);
    viewport.addEventListener("scroll", updateOffset);
    return () => {
      viewport.removeEventListener("resize", updateOffset);
      viewport.removeEventListener("scroll", updateOffset);
    };
  }, []);

  return offset;
}
