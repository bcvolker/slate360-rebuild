type TorchConstraint = MediaTrackConstraintSet & { torch?: boolean };

export function getCaptureVideoTrack(stream: MediaStream | null): MediaStreamTrack | null {
  if (!stream) return null;
  return stream.getVideoTracks()[0] ?? null;
}

export function isCaptureTorchSupported(track: MediaStreamTrack | null): boolean {
  if (!track?.getCapabilities) return false;
  const caps = track.getCapabilities();
  return Boolean(caps && "torch" in caps && caps.torch);
}

export async function setCaptureTorch(track: MediaStreamTrack, enabled: boolean): Promise<void> {
  const constraints: TorchConstraint = { torch: enabled };
  await track.applyConstraints({ advanced: [constraints] });
}
