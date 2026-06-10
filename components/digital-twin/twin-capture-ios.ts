/** iOS Safari detection and MediaRecorder mime selection for twin capture. */

export function isTwinCaptureIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ipadOs =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number"
      ? navigator.maxTouchPoints > 1
      : false;
  return /iPad|iPhone|iPod/.test(ua) || ipadOs;
}

export function resolveTwinCaptureVideoMimeType(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;

  if (isTwinCaptureIosDevice()) {
    const iosCandidates = [
      "video/mp4;codecs=avc1",
      "video/mp4",
      "video/quicktime",
    ];
    for (const mime of iosCandidates) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return null;
  }

  const webmCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const mime of webmCandidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
  return null;
}

export function isTwinCaptureVideoRecordingSupported(): boolean {
  return resolveTwinCaptureVideoMimeType() !== null;
}
