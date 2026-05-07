"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

type Props = {
  projectId: string;
  projectName: string;
  planSetId: string | null;
  disabled?: boolean;
};

export function StartPlanWalkButton({ projectId, projectName, planSetId, disabled = false }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startWalk() {
    if (!projectId || !planSetId || disabled || starting) return;
    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          session_type: "punch",
          title: `${projectName} — Plan Walk — ${new Date().toLocaleDateString()}`,
          metadata: { started_at: new Date().toISOString(), started_from: "plan_room", plan_set_id: planSetId },
        }),
      });

      const body = (await response.json().catch(() => null)) as { session?: { id?: string }; error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? `Server error ${response.status}`);
      const sessionId = body?.session?.id;
      if (!sessionId) throw new Error("No session ID returned from server");

      router.push(`/site-walk/capture?session=${encodeURIComponent(sessionId)}&plan=${encodeURIComponent(planSetId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start walk.");
      setStarting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-3 sm:p-4 shadow-[0_18px_50px_rgba(245,158,11,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">Ready for field capture</p>
          <p className="hidden text-sm font-bold text-slate-300 sm:block">Start a walk on this plan set — opens the mobile plan viewer.</p>
          {error && <p className="mt-1 text-sm font-bold text-rose-300">{error}</p>}
        </div>
        <button
          type="button"
          onClick={startWalk}
          disabled={disabled || starting || !planSetId}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.25)] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {starting ? "Starting…" : "Start walk with plans"}
        </button>
      </div>
    </div>
  );
}
