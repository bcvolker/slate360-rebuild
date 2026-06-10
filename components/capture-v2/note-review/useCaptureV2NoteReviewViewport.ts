"use client";

import { useEffect, useState } from "react";

type Args = {
  keyboardSimOverride?: number;
};

export function useCaptureV2NoteReviewViewport({ keyboardSimOverride }: Args = {}) {
  const [keyboardOffset, setKeyboardOffset] = useState(() =>
    typeof keyboardSimOverride === "number" ? keyboardSimOverride : 0,
  );
  const [visualHeight, setVisualHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof keyboardSimOverride === "number") {
      setKeyboardOffset(keyboardSimOverride);
      setVisualHeight(typeof window !== "undefined" ? window.innerHeight - keyboardSimOverride : null);
      return;
    }

    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;

    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
      setVisualHeight(vv.height);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [keyboardSimOverride]);

  return {
    keyboardOffset,
    keyboardOpen: keyboardOffset > 0,
    visualHeight,
  };
}
