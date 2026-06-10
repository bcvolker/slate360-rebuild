type TorchConstraint = MediaTrackConstraintSet & { torch?: boolean };

export function isTwinDepthSupported(): boolean {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getSupportedConstraints) {
    return false;
  }
  const caps = navigator.mediaDevices.getSupportedConstraints() as Record<string, boolean>;
  return Boolean(caps.depth);
}

export function getTwinVideoTrack(stream: MediaStream | null): MediaStreamTrack | null {
  if (!stream) return null;
  return stream.getVideoTracks()[0] ?? null;
}

export function isTwinTorchSupported(track: MediaStreamTrack | null): boolean {
  if (!track?.getCapabilities) return false;
  const caps = track.getCapabilities();
  return Boolean(caps && "torch" in caps && caps.torch);
}

export async function setTwinTorch(track: MediaStreamTrack, enabled: boolean): Promise<void> {
  const constraints: TorchConstraint = { torch: enabled };
  await track.applyConstraints({ advanced: [constraints] });
}
