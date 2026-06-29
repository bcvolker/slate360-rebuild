/**
 * Capture-time content hashing — the evidentiary foundation.
 *
 * Computes a SHA-256 of the EXACT captured bytes, on-device, before the file is
 * uploaded. Binding this hash to the item at capture is what lets the record
 * later satisfy FRE 902(14) self-authentication (the server re-hashes the stored
 * object and compares; a match proves the bytes are unchanged since capture).
 *
 * NOTE: this reads the whole blob into memory, which is fine for photos. Large
 * video/360 should move to a streamed/chunked digest (follow-up) to keep RAM flat.
 */
export async function sha256Hex(data: Blob | ArrayBuffer): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
