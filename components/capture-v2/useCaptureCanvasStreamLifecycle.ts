"use client";

import { useEffect } from "react";
import type { useCamera } from "@/lib/hooks/useCamera";

type CameraApi = ReturnType<typeof useCamera>;

type Args = {
  camera: CameraApi;
  facingMode: "user" | "environment";
  cameraPaused: boolean;
};

/** Keep getUserMedia alive during capture walk; detach video while preview/details are shown. */
export function useCaptureCanvasStreamLifecycle({ camera, facingMode, cameraPaused }: Args) {
  useEffect(() => {
    if (cameraPaused) {
      camera.detachVideo();
      return;
    }
    if (camera.needsUserResume) return;
    if (camera.streamAlive) {
      void camera.reattachVideo();
      return;
    }
    if (!camera.isStreaming) {
      void camera.startCamera(facingMode);
    }
  }, [camera, cameraPaused, facingMode]);

  useEffect(() => () => camera.stopCamera(), [camera]);
}
