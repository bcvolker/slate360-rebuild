"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/** Direct check — safe to call anywhere, but prefer useIsNativePlatform() in
 * components so SSR/first-paint doesn't render the wrong branch before hydration. */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** Hydration-safe native-platform check: false on the server and on first
 * client render (matching SSR output), flips to the real value right after
 * mount. Every native-only purchase/auth surface should gate through this,
 * not call Capacitor directly, so the behavior stays consistent everywhere. */
export function useIsNativePlatform(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(Capacitor.isNativePlatform());
  }, []);
  return native;
}
