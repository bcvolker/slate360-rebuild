"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, SkipForward, Loader2 } from "lucide-react";
import { LiveWalkShell } from "@/components/site-walk/LiveWalkShell";
import MarkupCanvas from "@/components/site-walk/MarkupCanvas";

interface Props {
  sessionId: string;
  itemId: string;
  title: string;
  imageUrl: string;
  initialSvg: string | null;
}

export default function MarkupClient({ sessionId, itemId, title, imageUrl, initialSvg }: Props) {
  const router = useRouter();
  const [svg, setSvg] = useState<string>(initialSvg ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const annotateUrl = `/site-walk/walks/active/${sessionId}/items/${itemId}/annotate`;

  async function persistMarkup() {
    if (!svg) return true; // nothing to save
    const res = await fetch(`/api/site-walk/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { markupSvg: svg } }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Failed to save markup");
      return false;
    }
    return true;
  }

  async function saveAndContinue() {
    setSaving(true);
    setError(null);
    try {
      const ok = await persistMarkup();
      if (ok) router.push(annotateUrl);
    } finally {
      setSaving(false);
    }
  }

  function skip() {
    router.push(annotateUrl);
  }

  return (
    <LiveWalkShell title={`Markup · ${title}`}>
      <div className="p-4 max-w-3xl mx-auto space-y-4 pb-24">
        <p className="text-xs text-slate-500">
          Optional — circle, arrow, or label what matters before adding notes.
        </p>

        <MarkupCanvas imageUrl={imageUrl} initialSvg={initialSvg} onChange={setSvg} />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={skip}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" /> Skip
          </button>
          <button
            type="button"
            onClick={saveAndContinue}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-cobalt hover:bg-cobalt-hover text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Save & Annotate
          </button>
        </div>
      </div>
    </LiveWalkShell>
  );
}
