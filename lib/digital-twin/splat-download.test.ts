import { afterEach, describe, expect, it, vi } from "vitest";

import { checkPlyComplete, downloadBytes } from "./splat-download";

function ply(vertices: number, bodyBytes?: number): Uint8Array {
  const header = new TextEncoder().encode(
    `ply\nformat binary_little_endian 1.0\nelement vertex ${vertices}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar a\nend_header\n`,
  );
  const body = new Uint8Array(bodyBytes ?? vertices * 13);
  const out = new Uint8Array(header.length + body.length);
  out.set(header);
  out.set(body, header.length);
  return out;
}

function streamOf(bytes: Uint8Array, headers: Record<string, string>) {
  return new Response(
    new ReadableStream({
      start(c) {
        for (let i = 0; i < bytes.length; i += 1000) c.enqueue(bytes.slice(i, i + 1000));
        c.close();
      },
    }),
    { status: 200, headers },
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("checkPlyComplete", () => {
  it("accepts a complete binary PLY and non-PLY bytes", () => {
    expect(checkPlyComplete(ply(1000))).toBeNull();
    expect(checkPlyComplete(new Uint8Array([0x4e, 0x47, 0x53, 0x50]))).toBeNull();
  });
  it("rejects a PLY whose body was cut off", () => {
    expect(checkPlyComplete(ply(1000, 5000))).toMatch(/truncated/);
  });
});

describe("downloadBytes", () => {
  it("returns the full body with progress when the length matches", async () => {
    const bytes = ply(500);
    vi.stubGlobal("fetch", vi.fn(async () => streamOf(bytes, { "content-length": String(bytes.length) })));
    const progress: number[] = [];
    const out = await downloadBytes("/x", new AbortController().signal, null, (l) => progress.push(l));
    expect(out).toEqual(bytes);
    expect(progress.at(-1)).toBe(bytes.length);
  });
  it("errors (never decodes) when the stream ends early", async () => {
    const bytes = ply(500);
    vi.stubGlobal("fetch", vi.fn(async () => streamOf(bytes.slice(0, 3000), { "content-length": String(bytes.length) })));
    await expect(downloadBytes("/x", new AbortController().signal, null)).rejects.toThrow(/incomplete/);
  });
  it("uses the signed size over a missing Content-Length", async () => {
    const bytes = ply(500);
    vi.stubGlobal("fetch", vi.fn(async () => streamOf(bytes.slice(0, 3000), {})));
    await expect(downloadBytes("/x", new AbortController().signal, bytes.length)).rejects.toThrow(/3000 of/);
  });
});
