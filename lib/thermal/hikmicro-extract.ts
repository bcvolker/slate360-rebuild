/**
 * HIKMICRO radiometric decoder (Pocket2 / HM-TP42 family).
 *
 * These cameras append a custom thermal block AFTER the JPEG end-of-image marker
 * (FF D9). The block starts with the ASCII magic "HDRI" and carries a width×height
 * grid of uint16 raw values, followed by a parameter footer ("RADIOMETRICIMAGE")
 * that holds emissivity and the frame's min/max display temperatures.
 *
 * Verified against real Pocket2 samples (June 2026): raw values map linearly to the
 * footer's frame min/max, reproducing the camera app's spot readings within ~0.4°C.
 */

export type HikmicroGrid = {
  width: number;
  height: number;
  /** Per-pixel temperatures in Celsius, row-major (length = width*height). */
  temps: Float32Array;
  minC: number;
  maxC: number;
  emissivity: number;
  /** Source display unit used for calibration ("F" | "C"). */
  sourceUnit: "F" | "C";
};

const EOI_0 = 0xff;
const EOI_1 = 0xd9;

function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

function findLastEoi(bytes: Uint8Array): number {
  for (let i = bytes.length - 2; i >= 0; i--) {
    if (bytes[i] === EOI_0 && bytes[i + 1] === EOI_1) return i;
  }
  return -1;
}

export function isHikmicroRadiometric(bytes: Uint8Array): boolean {
  const eoi = findLastEoi(bytes);
  if (eoi < 0 || eoi + 6 > bytes.length) return false;
  // "HDRI" magic immediately after the EOI marker.
  return (
    bytes[eoi + 2] === 0x48 &&
    bytes[eoi + 3] === 0x44 &&
    bytes[eoi + 4] === 0x52 &&
    bytes[eoi + 5] === 0x49
  );
}

/**
 * Decode a HIKMICRO radiometric JPEG into a Celsius temperature grid.
 *
 * @param sourceUnit The camera's display unit. Pocket2 stores the frame min/max in the
 *   user-selected unit; pass the unit the camera was set to (default "F"). A future
 *   firmware-flag lookup can auto-detect this once a °C sample is available.
 */
export function decodeHikmicro(bytes: Uint8Array, sourceUnit: "F" | "C" = "F"): HikmicroGrid {
  const eoi = findLastEoi(bytes);
  if (eoi < 0 || !isHikmicroRadiometric(bytes)) {
    throw new Error("Not a HIKMICRO radiometric file (no HDRI block after JPEG).");
  }
  const tailStart = eoi + 2;
  const view = new DataView(bytes.buffer, bytes.byteOffset + tailStart, bytes.length - tailStart);

  const width = view.getUint32(0x0c, true);
  const height = view.getUint32(0x10, true);
  const dataSize = view.getUint32(0x14, true);
  const pixelOffset = 0x2c;
  const count = width * height;

  if (width <= 0 || height <= 0 || pixelOffset + count * 2 > view.byteLength) {
    throw new Error(`HIKMICRO block has invalid dimensions (${width}x${height}).`);
  }

  // Footer parameters (relative to the start of the parameter block).
  const footStart = pixelOffset + dataSize;
  const emissivity = footStart + 0xa4 <= view.byteLength ? view.getFloat32(footStart + 0xa0, true) : 0.95;
  let dispMax = view.getFloat32(footStart + 0xf8, true); // +248
  let dispMin = view.getFloat32(footStart + 0xfc, true); // +252
  if (sourceUnit === "F") {
    dispMax = fToC(dispMax);
    dispMin = fToC(dispMin);
  }

  // Read raw grid and find its extremes.
  const raw = new Uint16Array(count);
  let rawMin = Infinity;
  let rawMax = -Infinity;
  for (let i = 0; i < count; i++) {
    const v = view.getUint16(pixelOffset + i * 2, true);
    raw[i] = v;
    if (v < rawMin) rawMin = v;
    if (v > rawMax) rawMax = v;
  }

  // Per-file linear calibration: raw extremes map to the footer's display extremes.
  const rawSpan = rawMax - rawMin || 1;
  const tempSpan = dispMax - dispMin;
  const temps = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    temps[i] = dispMin + ((raw[i] - rawMin) / rawSpan) * tempSpan;
  }

  return {
    width,
    height,
    temps,
    minC: Math.min(dispMin, dispMax),
    maxC: Math.max(dispMin, dispMax),
    emissivity: Number.isFinite(emissivity) ? emissivity : 0.95,
    sourceUnit,
  };
}
