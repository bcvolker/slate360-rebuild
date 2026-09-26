/**
 * Byte-level download + integrity helpers for splat files (used by hooks/useSplatBytes.ts).
 *
 * Why integrity checks: a large model streamed through a server function can be cut off mid-body (function
 * timeout, proxy reset) while the HTTP status stays 200. The stream then just ends early, and the truncated
 * bytes were handed to Spark as if complete — the viewer showed an empty canvas instead of an error.
 * Every download now proves it is complete (declared size + PLY header arithmetic) before decode.
 */

export type SignedSplatSource = { url: string; bytes: number | null; expiresInSec?: number };

export type DownloadSource = "direct" | "proxy";

/** Resolve a short-lived direct-download URL from a small authorized endpoint ({ url, bytes }). */
export async function resolveSignedSource(endpoint: string, signal: AbortSignal): Promise<SignedSplatSource> {
  const res = await fetch(endpoint, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`signed URL endpoint HTTP ${res.status}`);
  const data = (await res.json()) as Partial<SignedSplatSource> | null;
  if (!data || typeof data.url !== "string") throw new Error("signed URL endpoint returned no url");
  return { url: data.url, bytes: typeof data.bytes === "number" && data.bytes > 0 ? data.bytes : null };
}

/**
 * Stream `url` into memory with progress. `expectedBytes` (from the signing endpoint) wins over
 * Content-Length. Known length → one preallocated buffer (a 247 MB model never exists twice in memory).
 */
export async function downloadBytes(
  url: string,
  signal: AbortSignal,
  expectedBytes: number | null,
  onProgress?: (loaded: number, total: number | null) => void,
): Promise<Uint8Array> {
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // A compressed response's Content-Length is the compressed size; treat it as a hint only.
  const hinted = Number(res.headers.get("content-length") || 0);
  const total = expectedBytes ?? (res.headers.get("content-encoding") ? null : hinted > 0 ? hinted : null);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("empty response body");
  let prealloc: Uint8Array | null = total ? new Uint8Array(total) : null;
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  onProgress?.(0, total);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (prealloc && loaded + value.length <= prealloc.length) {
      prealloc.set(value, loaded);
    } else {
      if (prealloc) {
        chunks.push(prealloc.subarray(0, loaded));
        prealloc = null;
      }
      chunks.push(value);
    }
    loaded += value.length;
    onProgress?.(loaded, total);
  }
  if (total != null && loaded !== total) {
    throw new Error(`download incomplete: received ${loaded} of ${total} bytes`);
  }
  let out: Uint8Array;
  if (prealloc) {
    out = prealloc;
  } else {
    out = new Uint8Array(loaded);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
  }
  return out;
}

const PLY_TYPE_BYTES: Record<string, number> = {
  char: 1, uchar: 1, int8: 1, uint8: 1,
  short: 2, ushort: 2, int16: 2, uint16: 2,
  int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4,
  double: 8, float64: 8,
};

/**
 * For a binary PLY, verify the body holds every declared element (header arithmetic). Returns an error
 * message, or null when the file is complete or is not a fixed-stride binary PLY (SPZ, ASCII, list props).
 */
export function checkPlyComplete(bytes: Uint8Array): string | null {
  if (bytes.length < 4 || bytes[0] !== 0x70 || bytes[1] !== 0x6c || bytes[2] !== 0x79) return null; // "ply"
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 64 * 1024)));
  const end = head.indexOf("end_header\n");
  if (end < 0) return "model file is truncated (no PLY header end)";
  if (!/format binary_/.test(head.slice(0, end))) return null;
  let bodyBytes = 0;
  let count = 0;
  let stride = 0;
  for (const line of head.slice(0, end).split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "element") {
      bodyBytes += count * stride;
      count = Number(parts[2]) || 0;
      stride = 0;
    } else if (parts[0] === "property") {
      if (parts[1] === "list") return null; // variable stride: cannot check by arithmetic
      const size = PLY_TYPE_BYTES[parts[1]];
      if (!size) return null;
      stride += size;
    }
  }
  bodyBytes += count * stride;
  const need = end + "end_header\n".length + bodyBytes;
  return bytes.length < need ? `model file is truncated (${bytes.length} of ${need} bytes)` : null;
}
