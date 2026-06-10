"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCaptureVideoTrack,
  isCaptureTorchSupported,
  setCaptureTorch,
} from "@/lib/capture-v2/capture-torch";
import type { useCamera } from "@/lib/hooks/useCamera";

type CameraApi = ReturnType<typeof useCamera>;

export function useCaptureCanvasTorch(camera: CameraApi) {
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    const track = getCaptureVideoTrack(camera.streamRef.current);
    const supported = isCaptureTorchSupported(track);
    setTorchSupported(supported);
    if (!supported) setTorchOn(false);
  }, [camera.isStreaming, camera.streamAlive, camera.videoAttached]);

  const handleTorchToggle = useCallback(async () => {
    const track = getCaptureVideoTrack(camera.streamRef.current);
    if (!track || !isCaptureTorchSupported(track)) return;
    const next = !torchOn;
    try {
      await setCaptureTorch(track, next);
      setTorchOn(next);
    } catch {
      setTorchOn(false);
    }
  }, [camera.streamRef, torchOn]);

  useEffect(() => {
    if (!torchOn) return;
    return () => {
      const track = getCaptureVideoTrack(camera.streamRef.current);
      if (track && isCaptureTorchSupported(track)) {
        void setCaptureTorch(track, false).catch(() => undefined);
      }
    };
  }, [camera.streamRef, torchOn]);

  return { torchOn, torchSupported, handleTorchToggle };
}
