"use client";

import { useEffect, useState } from "react";

export function usePosterBytes(url: string | null): "pending" | "ok" | "fail" {
  const [state, setState] = useState<"pending" | "ok" | "fail">(url ? "pending" : "fail");
  useEffect(() => {
    if (!url) {
      setState("fail");
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setState("ok");
    };
    img.onerror = () => {
      if (!cancelled) setState("fail");
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state;
}
