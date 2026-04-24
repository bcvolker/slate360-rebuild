"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Footprints, Plus, Loader2 } from "lucide-react";

type SessionLite = {
  id: string;
  title: string;
  status: string;
  project_id: string;
  created_at: string;
};

type ProjectLite = { id: string; name: string };

export default function WalksClient({ initialProjects }: { initialProjects: ProjectLite[] }) {
  const router = useRouter();
  const [projects] = useState(initialProjects);
  const [projectId, setProjectId] = useState(initialProjects[0]?.id ?? "");
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/site-walk/sessions?project_id=${projectId}`)
      .then((r) => r.json())
      .then((j) => setSessions(j.sessions ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function startSession() {
    if (!projectId || !title.trim()) {
      setError("Pick a project and enter a title");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, title: title.trim() }),
      });
      const j = await res.json();
      if (!res.ok || !j.session) {
        setError(j.error ?? "Failed to create session");
        return;
      }
      router.push(`/site-walk/walks/active/${j.session.id}`);
    } finally {
      setCreating(false);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <Footprints className="h-12 w-12 mx-auto text-slate-500 mb-3" />
        <h1 className="text-xl font-semibold mb-2">No projects yet</h1>
        <p className="text-sm text-slate-400 mb-4">
          Create a project first, then start a walk inside it.
        </p>
        <Link
          href="/projects"
          className="inline-block px-4 py-2 rounded-lg bg-cobalt hover:bg-cobalt-hover text-primary-foreground text-sm"
        >
          Go to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Footprints className="h-6 w-6 text-cobalt" /> Walks
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Start a new walk-through or continue an active session.
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Plus className="h-4 w-4 text-cobalt" /> Start a new walk
        </h2>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Walk title (e.g. "Punch list — 3rd floor")'
          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={startSession}
          disabled={creating || !title.trim()}
          className="w-full py-2 rounded-lg bg-cobalt hover:bg-cobalt-hover disabled:opacity-50 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Start walk
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Recent sessions</h2>
        {loading ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No sessions for this project yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/site-walk/walks/active/${s.id}`}
                  className="block p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-cobalt/[0.06] hover:border-cobalt/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-100">{s.title}</span>
                    <span className="text-xs text-slate-500 capitalize">{s.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
