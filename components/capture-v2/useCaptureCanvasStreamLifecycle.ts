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

  useEffect(() => {
    lifecycleRunRef.current += 1;
    setLifecycleRunCount(lifecycleRunRef.current);

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
  }, [cameraPaused, facingMode, isStreaming, streamAlive, needsUserResume]);

  useEffect(() => {
    return () => {
      stopCameraRef.current();
    };
  }, []);

  return { lifecycleRunCount };
}
