"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/** Keeps the screen awake during long Site Walk capture sessions */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsLocked(true);
      wakeLockRef.current.addEventListener("release", () => setIsLocked(false));
    } catch {
      // Low battery or permission denied — silently degrade
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsLocked(false);
    }
  }, []);

  // Re-acquire after tab becomes visible again (browsers release on visibility change)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && isLocked) {
        request();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isLocked, request]);

  return { isLocked, request, release };
}
