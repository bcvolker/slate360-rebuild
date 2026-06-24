"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Opt-in scene-aware AI pass. Nothing here costs money until the button is
 * pressed. Dispatches the interpret job, then refreshes a few times as the
 * worker writes neutral, scene-grounded findings back onto each image. The
 * monthly spend cap is enforced server-side (worker); a "capped" result surfaces
 * as a message on the session.
 */
export function ThermalAiSceneCheck({
  sessionId,
  captureIds,
  label = "AI scene check",
  profile = "general",
}: {
  sessionId: string;
  /** Omit to interpret every flagged capture in the session. */
  captureIds?: string[];
  label?: string;
  profile?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/interpret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capture_ids: captureIds, profile }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start AI scene check");
      setNote("Reading the scene… findings appear on each image in a minute or two.");
      // The worker writes back asynchronously; refresh as results land.
      for (const delay of [70000, 55000, 45000]) {
        await new Promise((r) => setTimeout(r, delay));
        router.refresh();
      }
      setNote("AI scene check finished — review the findings (AI-assisted; confirm before issuing).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        title="Look at the image to understand the scene, then write neutral, scene-appropriate findings. Uses the cloud AI (cost-capped); opt-in."
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] disabled:opacity-50"
      >
        {busy ? "Reading scene…" : `✨ ${label}`}
      </button>
      {note ? <span className="text-[10px] text-[var(--graphite-muted)]">{note}</span> : null}
      {error ? <span className="text-[10px] text-[#fca5a5]">{error}</span> : null}
    </div>
  );
}
