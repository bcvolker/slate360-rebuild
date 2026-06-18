/**
 * Minimal NPZ (`numpy.savez_compressed`) reader for Node.
 *
 * An .npz is a ZIP archive whose members are .npy arrays. The thermal extract
 * worker writes `radiometric.npz` containing a `temperatures` float array shaped
 * (height, width) in degrees Celsius. We parse it server-side so the interactive
 * probe grid works for EVERY sensor profile (FLIR/DJI/Autel/HIKMICRO), not only
 * the formats with a browser-side decoder.
 *
 * We walk the ZIP central directory (robust against data descriptors), inflate the
 * member, then parse the .npy header for shape + dtype.
 */

import { inflateRawSync } from "node:zlib";

export type RadiometricGrid = {
  width: number;
  height: number;
  /** Row-major temperatures in Celsius, length === width * height. */
  temps: Float64Array;
  minC: number;
  maxC: number;
};

const EOCD_SIG = 0x06054b50; // End of central directory
const CEN_SIG = 0x02014b50; // Central directory file header
const LOC_HEADER_FIXED = 30; // Local file header fixed size

function findEocdOffset(buf: Buffer): number {
  // EOCD is at the end; comment is usually empty. Scan back a bounded window.
  const minOffset = Math.max(0, buf.length - 0xffff - 22);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

/** Extract the raw (decompressed) bytes of a single named member from a ZIP buffer. */
function readZipMember(buf: Buffer, predicate: (name: string) => boolean): Buffer {
  const eocd = findEocdOffset(buf);
  if (eocd < 0) throw new Error("NPZ: end-of-central-directory not found");

  const entryCount = buf.readUInt16LE(eocd + 10);
  let cursor = buf.readUInt32LE(eocd + 16); // central directory start offset

  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(cursor) !== CEN_SIG) {
      throw new Error("NPZ: malformed central directory entry");
    }
    const compression = buf.readUInt16LE(cursor + 10);
    const compressedSize = buf.readUInt32LE(cursor + 20);
    const nameLen = buf.readUInt16LE(cursor + 28);
    const extraLen = buf.readUInt16LE(cursor + 30);
    const commentLen = buf.readUInt16LE(cursor + 32);
    const localOffset = buf.readUInt32LE(cursor + 42);
    const name = buf.toString("utf8", cursor + 46, cursor + 46 + nameLen);

    if (predicate(name)) {
      const localNameLen = buf.readUInt16LE(localOffset + 26);
      const localExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + LOC_HEADER_FIXED + localNameLen + localExtraLen;
      const compressed = buf.subarray(dataStart, dataStart + compressedSize);
      if (compression === 0) return Buffer.from(compressed); // stored
      if (compression === 8) return inflateRawSync(compressed); // deflate
      throw new Error(`NPZ: unsupported compression method ${compression}`);
    }

    cursor += 46 + nameLen + extraLen + commentLen;
  }

  throw new Error("NPZ: requested member not found");
}

/** Parse a .npy buffer into a Float64Array plus its (height, width) shape. */
function parseNpy(npy: Buffer): { data: Float64Array; shape: number[] } {
  // Magic: \x93NUMPY, then major/minor version bytes.
  if (npy.readUInt8(0) !== 0x93 || npy.toString("ascii", 1, 6) !== "NUMPY") {
    throw new Error("NPY: bad magic");
  }
  const major = npy.readUInt8(6);
  let headerLen: number;
  let headerStart: number;
  if (major >= 2) {
    headerLen = npy.readUInt32LE(8);
    headerStart = 12;
  } else {
    headerLen = npy.readUInt16LE(8);
    headerStart = 10;
  }
  const header = npy.toString("latin1", headerStart, headerStart + headerLen);

  const descrMatch = header.match(/'descr'\s*:\s*'([^']+)'/);
  const shapeMatch = header.match(/'shape'\s*:\s*\(([^)]*)\)/);
  if (!descrMatch || !shapeMatch) throw new Error("NPY: unparsable header");

  const descr = descrMatch[1]; // e.g. "<f4", "<f8"
  const shape = shapeMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10));

  const dataStart = headerStart + headerLen;
  const body = npy.subarray(dataStart);
  const count = shape.reduce((a, b) => a * b, 1);

  let data: Float64Array;
  if (descr === "<f4") {
    const view = new Float32Array(body.buffer, body.byteOffset, count);
    data = Float64Array.from(view);
  } else if (descr === "<f8") {
    data = Float64Array.from(new Float64Array(body.buffer, body.byteOffset, count));
  } else if (descr === "<i2" || descr === "<u2") {
    const view = descr === "<i2"
      ? new Int16Array(body.buffer, body.byteOffset, count)
      : new Uint16Array(body.buffer, body.byteOffset, count);
    data = Float64Array.from(view);
  } else {
    throw new Error(`NPY: unsupported dtype ${descr}`);
  }

  return { data, shape };
}

/**
 * Decode a `radiometric.npz` buffer into a per-pixel temperature grid.
 * @param memberName name of the array inside the archive (default "temperatures").
 */
export function decodeRadiometricNpz(
  npzBytes: Uint8Array,
  memberName = "temperatures",
): RadiometricGrid {
  const buf = Buffer.isBuffer(npzBytes) ? npzBytes : Buffer.from(npzBytes);
  const target = `${memberName}.npy`;
  const npy = readZipMember(
    buf,
    (name) => name === target || name.endsWith(`/${target}`) || name.endsWith(target),
  );
  const { data, shape } = parseNpy(npy);

  // numpy saves images as (height, width); fall back to a square if 1-D.
  const height = shape.length >= 2 ? shape[0] : Math.round(Math.sqrt(data.length));
  const width = shape.length >= 2 ? shape[1] : Math.round(data.length / height);

  let minC = Infinity;
  let maxC = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (Number.isFinite(v)) {
      if (v < minC) minC = v;
      if (v > maxC) maxC = v;
    }
  }
  if (!Number.isFinite(minC)) {
    minC = 0;
    maxC = 0;
  }

  return { width, height, temps: data, minC, maxC };
}
