"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiDARCapture, isLiDARAvailable } from "@/src/plugins/LiDARCapture";
import type { PluginListenerHandle } from "@capacitor/core";

export type LiDARCaptureFiles = {
  plyFile: File;
  posesFile: File;
};

export function useLiDARCapture() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const listenerRef = useRef<PluginListenerHandle | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    isLiDARAvailable().then((avail) => {
      if (!cancelled) setIsAvailable(avail);
    });
    return () => { cancelled = true; };
  }, []);

  // Keep a ref in sync so cleanup in the unmount effect sees current value.
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  const startCapture = useCallback(async () => {
    if (!isAvailable || isActiveRef.current) return;
    try {
      await LiDARCapture.startSession({ confidence: "medium" });
      setIsActive(true);
      setPointCount(0);
      listenerRef.current = await LiDARCapture.addListener("progress", (data) => {
        setPointCount(data.pointCount);
      });
    } catch (err) {
      console.warn("[useLiDARCapture] startCapture failed (non-fatal):", err);
    }
  }, [isAvailable]);

  const stopCapture = useCallback(async (): Promise<LiDARCaptureFiles | null> => {
    if (!isAvailable || !isActiveRef.current) return null;
    try {
      // Remove progress listener before stopping to avoid stale updates.
      await listenerRef.current?.remove();
      listenerRef.current = null;

      await LiDARCapture.stopSession();
      const exported = await LiDARCapture.exportData();

      // Convert file:// URIs to File objects.  Capacitor's WKWebView allows
      // fetch() against file:// URIs that it placed in NSTemporaryDirectory.
      const [plyBlob, posesBlob] = await Promise.all([
        fetch(exported.plyUri).then((r) => r.blob()),
        fetch(exported.posesUri).then((r) => r.blob()),
      ]);

      const plyFile = new File([plyBlob], "lidar_capture.ply", { type: "application/octet-stream" });
      const posesFile = new File([posesBlob], "lidar_poses.json", { type: "application/json" });

      await LiDARCapture.cleanup();
      setIsActive(false);
      setPointCount(0);
      return { plyFile, posesFile };
    } catch (err) {
      console.warn("[useLiDARCapture] stopCapture/export failed (non-fatal):", err);
      setIsActive(false);
      return null;
    }
  }, [isAvailable]);

  const cleanup = useCallback(async () => {
    try {
      await listenerRef.current?.remove();
      listenerRef.current = null;
      if (isAvailable) await LiDARCapture.cleanup().catch(() => {});
    } catch {}
    setIsActive(false);
    setPointCount(0);
  }, [isAvailable]);

  // Stop and clean up on unmount without triggering React state updates.
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        void LiDARCapture.stopSession().catch(() => {});
        void LiDARCapture.cleanup().catch(() => {});
      }
      void listenerRef.current?.remove().catch(() => {});
    };
  }, []); // intentionally empty — runs once on unmount

  return { isAvailable, isActive, pointCount, startCapture, stopCapture, cleanup };
}
