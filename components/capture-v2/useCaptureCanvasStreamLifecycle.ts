"use client";

import { useEffect, useRef, useState } from "react";
import type { useCamera } from "@/lib/hooks/useCamera";

type CameraApi = ReturnType<typeof useCamera>;

type Args = {
  camera: CameraApi;
  facingMode: "user" | "environment";
  cameraPaused: boolean;
};

/** Hold getUserMedia only while actively framing. The camera is released
 *  (stopped, not just detached) whenever the preview is paused for a captured-
 *  photo/details sheet, when the app is backgrounded, or on unmount — so iOS's
 *  camera indicator is dark except in the moments you're lining up a shot. It
 *  is re-acquired (~1-2s) when you return to the live view. */
export function useCaptureCanvasStreamLifecycle({ camera, facingMode, cameraPaused }: Args) {
  const [lifecycleRunCount, setLifecycleRunCount] = useState(0);
  const lifecycleRunRef = useRef(0);

  const stopCameraRef = useRef(camera.stopCamera);
  stopCameraRef.current = camera.stopCamera;

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

    if (appHidden || cameraPaused) {
      // Fully release the camera (not just detach the <video>) so the iOS
      // camera indicator clears while reviewing a shot, in a sheet, or in the
      // background. Re-acquired below once we're framing again.
      stopCameraRef.current();
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
