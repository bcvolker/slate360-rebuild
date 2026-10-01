"use client";

import { useEffect, useState } from "react";

type Doc = {
  id: string;
  title: string;
  type: string;
  sourceUrl: string | null;
};

type Ref = {
  pinId: string;
  walkthroughId: string | null;
  tSeconds: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
  href: string;
};

export function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [refs, setRefs] = useState<Record<string, Ref[]>>({});
  const [title, setTitle] = useState("");

  const load = () => {
    void fetch(`/api/spatial-walkthrough/project-documents?projectId=${projectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setDocs(j.documents ?? []))
      .catch(() => undefined);
    void fetch(`/api/spatial-walkthrough?projectId=${projectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(async (j) => {
        const walks = (j.walkthroughs ?? []) as Array<{ id: string }>;
        const next: Record<string, Ref[]> = {};
        for (const walk of walks.slice(0, 8)) {
          const payload = await fetch(`/api/spatial-walkthrough/${walk.id}`, { cache: "no-store" }).then((r) => r.json());
          for (const pin of (payload.pins ?? []) as Array<Record<string, unknown>>) {
            const pinId = String(pin.id);
            const href = `/spatial-walkthrough/${walk.id}?pin=${pinId}&t=${pin.t_seconds ?? 0}&yaw=${pin.yaw_deg ?? 0}&pitch=${pin.pitch_deg ?? 0}`;
            const key = String(pin.document_id ?? pin.label ?? pinId);
            next[key] = [...(next[key] ?? []), {
              pinId,
              walkthroughId: walk.id,
              tSeconds: pin.t_seconds == null ? null : Number(pin.t_seconds),
              yawDeg: pin.yaw_deg == null ? null : Number(pin.yaw_deg),
              pitchDeg: pin.pitch_deg == null ? null : Number(pin.pitch_deg),
              href,
            }];
          }
        }
        setRefs(next);
      })
      .catch(() => undefined);
  };

  useEffect(() => { load(); }, [projectId]);

  const upload = async () => {
    if (!title.trim()) return;
    await fetch("/api/spatial-walkthrough/project-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title: title.trim(), type: "spec" }),
    });
    setTitle("");
    load();
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold text-white">Documents</h1>
      <div className="mb-6 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-12 flex-1 border border-white/10 bg-transparent px-3 text-sm" />
        <button type="button" className="h-12 border border-white/20 px-4 text-sm" onClick={() => void upload()}>Add once</button>
      </div>
      <ul className="space-y-4">
        {docs.map((doc) => {
          const spatial = Object.entries(refs).flatMap(([, list]) => list.filter((r) => r.pinId));
          const mine = spatial.filter((r) => refs[doc.id]?.length || refs[doc.title]?.length);
          const list = refs[doc.id] ?? refs[doc.title] ?? mine.filter((r) => r.href.includes(doc.id));
          return (
            <li key={doc.id} className="border border-white/10 p-4">
              <p className="text-white">{doc.title}</p>
              <p className="text-xs text-[var(--graphite-muted)]">{doc.type} · Spatial References ({list.length})</p>
              {list.map((r) => (
                <a key={r.pinId} href={r.href} className="mt-2 block text-sm text-[var(--graphite-primary)]">
                  Open at t {r.tSeconds ?? "—"} · yaw {r.yawDeg ?? "—"} · pitch {r.pitchDeg ?? "—"}
                </a>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
