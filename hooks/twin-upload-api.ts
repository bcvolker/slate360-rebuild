export type InitUploadRow = {
  assetId: string;
  uploadId: string;
  key: string;
  partSizeBytes: number;
  totalParts: number;
};

export async function parseTwinApiJson<T>(res: Response): Promise<T> {
  const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? `Request failed (${res.status})`);
  }
  return payload;
}

export async function twinApiPost<T>(path: string, body: unknown): Promise<T> {
  return parseTwinApiJson<T>(
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
