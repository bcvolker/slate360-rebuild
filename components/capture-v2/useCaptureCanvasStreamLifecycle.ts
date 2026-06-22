"use client";

import { useEffect, useRef, useState } from "react";
import type { useCamera } from "@/lib/hooks/useCamera";

type CameraApi = ReturnType<typeof useCamera>;

type Args = {
  camera: CameraApi;
  facingMode: "user" | "environment";
  cameraPaused: boolean;
};

/** Keep getUserMedia alive during capture walk; detach video while preview/details are shown. */
export function useCaptureCanvasStreamLifecycle({ camera, facingMode, cameraPaused }: Args) {
  const [lifecycleRunCount, setLifecycleRunCount] = useState(0);
  const lifecycleRunRef = useRef(0);

  const stopCameraRef = useRef(camera.stopCamera);
  stopCameraRef.current = camera.stopCamera;

  const detachVideoRef = useRef(camera.detachVideo);
  detachVideoRef.current = camera.detachVideo;

  const reattachVideoRef = useRef(camera.reattachVideo);
  reattachVideoRef.current = camera.reattachVideo;

  const startCameraRef = useRef(camera.startCamera);
  startCameraRef.current = camera.startCamera;

  const { isStreaming, streamAlive, needsUserResume } = camera;

  // Release the camera while the app is backgrounded so iOS clears its
  // camera-in-use indicator (a live preview otherwise keeps it lit, which looks
  // like the app is "always recording"). The stream is re-acquired on return —
  // only after coming back from background, never during active capture.
  const [appHidden, setAppHidden] = useState(false);

  useEffect(() => {
    const sync = () => setAppHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  useEffect(() => {
    lifecycleRunRef.current += 1;
    setLifecycleRunCount(lifecycleRunRef.current);

    if (appHidden) {
      stopCameraRef.current();
      return;
    }
    if (cameraPaused) {
      detachVideoRef.current();
      return;
    }
    if (needsUserResume) return;
    if (streamAlive) {
      void reattachVideoRef.current();
      return;
    }
    if (!isStreaming) {
      void startCameraRef.current(facingMode);
    }
  }, [appHidden, cameraPaused, facingMode, isStreaming, streamAlive, needsUserResume]);

  useEffect(() => {
    return () => {
      stopCameraRef.current();
    };
  }, []);

  return { lifecycleRunCount };
}
