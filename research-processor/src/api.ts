import type { CaptureType, EnvStatus, Quality } from "./types";

const jsonHeaders = { "Content-Type": "application/json" };

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body as T;
}

export const api = {
  env: () => fetch("/api/env").then((r) => parse<EnvStatus>(r)),
  status: () => fetch("/api/job/status").then((r) => parse<Record<string, unknown>>(r)),
  start: (body: {
    projectName: string;
    inputPath: string;
    captureType: CaptureType;
    quality: Quality;
  }) => fetch("/api/job/start", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }).then((r) => parse(r)),
  cancel: () => fetch("/api/job/cancel", { method: "POST" }).then((r) => parse(r)),
  openFolder: (dir?: string) =>
    fetch("/api/open-folder", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ dir }) }).then((r) => parse(r)),
  diagnostics: () => fetch("/api/diagnostics", { method: "POST" }).then((r) => parse(r)),
  screenshot: (pngBase64: string, view: string, name: string) =>
    fetch("/api/screenshot", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ pngBase64, view, name }),
    }).then((r) => parse(r)),
};

export function fileUrl(absPath: string): string {
  return `/files/${encodeURIComponent(absPath)}`;
}
