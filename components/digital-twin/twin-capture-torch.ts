import {
  getTwinVideoTrack,
  isTwinTorchSupported,
  setTwinTorch,
} from "@/lib/digital-twin/twin-capture-device";

export { getTwinVideoTrack, isTwinTorchSupported };

export async function toggleTwinCaptureTorch(
  stream: MediaStream | null,
  nextOn: boolean,
): Promise<boolean> {
  const track = getTwinVideoTrack(stream);
  if (!track || !isTwinTorchSupported(track)) return false;
  await setTwinTorch(track, nextOn);
  return true;
}
