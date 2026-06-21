"use client";

import { useEffect, useState } from "react";

export type DeviceKind = "desktop" | "mobile";
export type DeviceCaptureInput = "camera" | "upload";

export function useDeviceContext() {
  const [deviceKind, setDeviceKind] = useState<DeviceKind>("desktop");

  useEffect(() => {
    const queries = [window.matchMedia("(pointer: coarse)"), window.matchMedia("(hover: none)"), window.matchMedia("(max-width: 767px)")];
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
  const noHover = window.matchMedia("(hover: none)").matches;
  const narrowViewport = window.matchMedia("(max-width: 767px)").matches;
  // A touchscreen phone/tablet is "mobile" even in landscape (where width can
  // exceed 767px). Requiring narrowViewport too used to flip landscape phones to
  // the DESKTOP studio — which is why the desktop "Drop photos here" dropzone
  // appeared on a rotated phone. Touch signal OR narrow window ⇒ mobile.
  return (coarsePointer && noHover) || narrowViewport ? "mobile" : "desktop";
}