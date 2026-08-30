"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WalkthroughLibrary, type WalkthroughCard } from "@/components/spatial-walkthrough/WalkthroughLibrary";
import { WalkthroughSpaceList } from "@/components/spatial-walkthrough/WalkthroughSpaceList";
import type { SpaceCard } from "@/lib/spatial-walkthrough/space-cards";
import { spaceHref } from "@/lib/spatial-walkthrough/space-cards";

export function SpatialWalkthroughIndex({ canAuthor }: { canAuthor: boolean }) {
  const [items, setItems] = useState<WalkthroughCard[]>([]);
  const [spaces, setSpaces] = useState<SpaceCard[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/spatial-walkthrough", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setItems(json.walkthroughs ?? []);
      setSpaces(json.spaces ?? []);
    }
  };

  useEffect(() => {
    void load();
    void fetch("/api/projects")
      .then((r) => r.json())
      .then((j) => setProjects(j.projects ?? j.items ?? []))
      .catch(() => undefined);
  }, []);

  const create = async () => {
    setError(null);
    const res = await fetch("/api/spatial-walkthrough", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not create walkthrough");
      return;
    }
    window.location.href = `/spatial-walkthrough/${json.walkthrough.id}`;
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Spatial Walkthrough</p>
          <h1 className="text-2xl font-semibold text-[var(--graphite-text-header)]">Library</h1>
        </div>
        {canAuthor ? (
          <Link href="/spatial-walkthrough/branding" className="text-sm text-[var(--graphite-primary)]">
            Branding
          </Link>
        ) : null}
      </div>
      {canAuthor ? (
        <div className="grid gap-2 border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[1fr_1fr_auto]">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-11 border border-white/10 bg-transparent px-2">
            <option value="">Choose project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Walkthrough title" className="h-11 border border-white/10 bg-transparent px-3" />
          <button type="button" onClick={() => void create()} className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]">
            Create
          </button>
          {error ? <p className="sm:col-span-3 text-sm">{error}</p> : null}
        </div>
      ) : null}
      <WalkthroughLibrary items={items} hrefFor={(id) => `/spatial-walkthrough/${id}`} />
      <WalkthroughSpaceList items={spaces} hrefFor={(item) => spaceHref(item, (id) => `/spatial-walkthrough/${id}`)} />
    </div>
  );
}
