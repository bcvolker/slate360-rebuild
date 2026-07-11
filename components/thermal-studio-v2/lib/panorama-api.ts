export type PanoramaDispatchResult = { dispatched: boolean; sources: number } | { error: string };

/** PAN: dispatches a stitch request for the given capture ids (needs ≥2 decoded images). */
export async function dispatchPanoramaStitch(sessionId: string, captureIds: string[]): Promise<PanoramaDispatchResult> {
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/panorama`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captureIds }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json?.error ?? "Failed to start panorama stitch" };
    const data = json.data ?? json;
    return { dispatched: Boolean(data.dispatched), sources: Number(data.sources ?? captureIds.length) };
  } catch {
    return { error: "Network error — stitch not started" };
  }
}
