"use client";

import { useEffect, useState } from "react";

export type DeviceKind = "desktop" | "mobile";
export type DeviceCaptureInput = "camera" | "upload";

export function useDeviceContext() {
  const [deviceKind, setDeviceKind] = useState<DeviceKind>(() => detectDeviceKind());

  useEffect(() => {
    const queries = [window.matchMedia("(pointer: coarse)"), window.matchMedia("(max-width: 767px)")];
    const update = () => setDeviceKind(detectDeviceKind());
    update();
    window.addEventListener("resize", update);
    for (const query of queries) query.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      for (const query of queries) query.removeEventListener("change", update);
    };
  }, []);

  const primaryCaptureInput: DeviceCaptureInput = deviceKind === "mobile" ? "camera" : "upload";
  return {
    deviceKind,
    isMobile: deviceKind === "mobile",
    isDesktop: deviceKind === "desktop",
    primaryCaptureInput,
    primaryCaptureLabel: primaryCaptureInput === "camera" ? "Camera" : "Upload Photo",
  };
}

function detectDeviceKind(): DeviceKind {
  if (typeof window === "undefined") return "desktop";
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowViewport = window.matchMedia("(max-width: 767px)").matches;
  const touchCapable = navigator.maxTouchPoints > 0;
  return coarsePointer || (touchCapable && narrowViewport) ? "mobile" : "desktop";
}