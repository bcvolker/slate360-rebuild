"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileBarChart2, Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

interface Props {
  sessionId: string;
  sessionTitle: string;
  projectName: string | null;
  totalItems: number;
  openItems: number;
}

export default function StatusReportClient({
  sessionId,
  sessionTitle,
  projectName,
  totalItems,
  openItems,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/sessions/${sessionId}/status-report`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as { deliverable_id?: string; error?: string };
      if (!res.ok || !j.deliverable_id) {
        setError(j.error ?? "Could not generate report");
        return;
      }
      router.push(`/site-walk/deliverables/${j.deliverable_id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-cobalt/15 border border-cobalt/30 flex items-center justify-center shrink-0">
            <FileBarChart2 className="h-6 w-6 text-cobalt" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">Auto-generate a status report</h2>
            <p className="text-sm text-slate-400 mt-1">
              Turns every item from this walk into a leadership-ready PDF with the same data
              you already captured. No double-entry — your field notes <em>are</em> the report.
            </p>
            {projectName && (
              <p className="text-xs text-slate-500 mt-2">Project: {projectName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Stat label="Total items" value={totalItems} />
          <Stat label="Open / in progress" value={openItems} accent="amber" />
        </div>

        {totalItems === 0 ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>This walk has no items yet. Capture at least one photo or note before generating a report.</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white font-medium disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating…" : `Generate report from ${totalItems} item${totalItems === 1 ? "" : "s"}`}
          </button>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-300 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-xs text-slate-400 space-y-1.5">
        <p className="flex items-center gap-1.5 text-slate-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> What gets included
        </p>
        <ul className="space-y-1 ml-5 list-disc">
          <li>Summary header with open / in-progress / resolved counts</li>
          <li>Every item ordered by status (open first, resolved last)</li>
          <li>Photos with their notes; text notes verbatim (truncated at 240 chars per item)</li>
          <li>Walk title &quot;{sessionTitle}&quot; and generation timestamp</li>
        </ul>
        <p className="text-slate-500 pt-2">
          The generated deliverable is a draft — review, edit, and share/email it like any other deliverable.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "amber" }) {
  const colorClass =
    accent === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className={`text-2xl font-semibold tabular-nums ${colorClass}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
