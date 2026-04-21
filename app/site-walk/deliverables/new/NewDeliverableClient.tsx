"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";

type Session = { id: string; title: string; created_at: string };

const TYPES = [
  { value: "photo_log", label: "Photo log", desc: "Visual feed of all captures" },
  { value: "punchlist", label: "Punch list", desc: "Items needing action" },
  { value: "report", label: "Report", desc: "Narrative summary" },
  { value: "custom", label: "Custom", desc: "Start from scratch" },
] as const;

export default function NewDeliverableClient({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [type, setType] = useState<typeof TYPES[number]["value"]>("photo_log");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!sessionId) { setError("Pick a session"); return; }
    setBusy(true);
    setError(null);
    try {
      // Hydrate items so the deliverable carries a content snapshot the
      // viewer can render. Photo URLs use the public /api/view/[token]/media
      // resolver so they keep working after share.
      const itemsRes = await fetch(`/api/site-walk/items?session_id=${sessionId}`);
      const itemsJson = await itemsRes.json();
      const rawItems: Array<Record<string, unknown>> = itemsJson.items ?? [];

      const content = rawItems
        .filter((it) => {
          const t = it.item_type;
          if (t === "photo" || t === "video") return Boolean(it.s3_key);
          return t === "text_note" || t === "voice_note";
        })
        .map((it) => {
          const id = it.id as string;
          const itemType = it.item_type as string;
          const base = {
            id,
            title: (it.title as string) || "",
            notes: (it.description as string) || undefined,
            metadata: it.metadata && typeof it.metadata === "object" ? it.metadata as Record<string, unknown> : undefined,
          };
          if (itemType === "photo") return { ...base, type: "photo", mediaItemId: id };
          if (itemType === "video") return { ...base, type: "video", mediaItemId: id };
          if (itemType === "voice_note") return { ...base, type: "voice", mediaItemId: id };
          return { ...base, type: "note" };
        });

      const res = await fetch("/api/site-walk/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          deliverable_type: type,
          title: title.trim() || `Untitled ${type.replace("_", " ")}`,
          content,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.deliverable) {
        setError(j.error ?? "Create failed");
        return;
      }
      router.push(`/site-walk/deliverables/${j.deliverable.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-slate-400">No sessions yet. Start a walk first.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Session</label>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} — {new Date(s.created_at).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`p-3 text-left rounded-lg border text-sm transition ${
                type === t.value
                  ? "bg-cobalt/15 border-cobalt/40 text-cobalt"
                  : "border-white/10 hover:border-cobalt/30 text-slate-200"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Title (optional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Site walk — North wing — 4/21"
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={create}
        disabled={busy}
        className="w-full py-2 rounded-lg bg-cobalt hover:bg-cobalt-hover disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Build deliverable
      </button>
    </div>
  );
}
