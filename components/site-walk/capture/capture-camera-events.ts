"use client";

export const SITE_WALK_CAMERA_EVENT = "site-walk:camera-request";

type CameraRequestDetail = {
  source: "quick_capture" | "plan_pin" | "next_item";
  input: "camera" | "upload";
};

export function requestCameraCapture(input: CameraRequestDetail["input"], source: CameraRequestDetail["source"] = "quick_capture") {
  window.dispatchEvent(new CustomEvent<CameraRequestDetail>(SITE_WALK_CAMERA_EVENT, { detail: { source, input } }));
}

export function subscribeCameraCapture(callback: (detail: CameraRequestDetail) => void) {
  function handle(event: Event) {
    if (!(event instanceof CustomEvent)) return;
    const detail = event.detail as Partial<CameraRequestDetail> | null;
    if ((detail?.input === "camera" || detail?.input === "upload") && detail.source) callback(detail as CameraRequestDetail);
  }
  window.addEventListener(SITE_WALK_CAMERA_EVENT, handle);
  return () => window.removeEventListener(SITE_WALK_CAMERA_EVENT, handle);
}
