"use client";

import { useEffect, useState } from "react";

type Project = { id: string; name: string };

export function PublishToPortal({ jobId }: { jobId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects((d.projects ?? []) as Project[]))
      .catch(() => setProjects([]));
  }, []);

  const send = async () => {
    if (!projectId) { setMsg("Pick a project."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/splat-lab/jobs/${jobId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error ?? "publish failed"); return; }
      const n = Array.isArray(data.published) ? data.published.length : 0;
      setMsg(`Saved ${n} file${n === 1 ? "" : "s"} to 03_Digital_Twin / Deliverables.`);
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-[var(--graphite-canvas)] p-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Send to portal</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
          className="min-w-[180px] flex-1 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2 py-1.5 font-mono text-xs text-[var(--graphite-text-body)]">
          <option value="">Project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={send} disabled={busy}
          className="rounded-md bg-[var(--twin360-blue)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
      {msg ? <p className="mt-1.5 text-[11px] text-[var(--graphite-muted)]">{msg}</p> : null}
    </div>
  );
}
