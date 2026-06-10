/** Grab a JPEG data URL from the live twin capture video element. */

export function grabTwinCaptureVideoFrame(
  video: HTMLVideoElement | null | undefined,
): string | null {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.62);
  } catch {
    return null;
  }
}
