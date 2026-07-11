export type InterpretDispatchResult = { ok: boolean; message: string };

/** S6 "Run AI on N" — dispatches the R1 interpret route (job-row + dedupe + accept-then-processing). */
export async function dispatchInterpret(
  sessionId: string,
  captureIds: string[],
  profile = "general",
): Promise<InterpretDispatchResult> {
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/interpret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capture_ids: captureIds, profile }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 402) {
        return { ok: false, message: `Need ${json?.required ?? "more"} credits — Buy credits` };
      }
      return { ok: false, message: (json?.error as string) ?? `Failed (${res.status})` };
    }
    return { ok: true, message: json?.deduped ? "Already running" : "Running AI review…" };
  } catch {
    return { ok: false, message: "Network error — AI review not started" };
  }
}
