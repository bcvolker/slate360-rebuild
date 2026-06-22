"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ImageOff, Loader2 } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import type { SiteWalkItem } from "@/lib/types/site-walk";

type Group = { location: string; items: SiteWalkItem[] };
type Response = { groups?: Group[]; error?: string };

export default function ProgressionPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center px-4 py-10 text-slate-400">Loading…</div>}>
      <ProgressionPageInner />
    </Suspense>
  );
}

function ProgressionPageInner() {
  const search = useSearchParams();
  const projectId = search?.get("projectId") ?? null;
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/site-walk/projects/${encodeURIComponent(projectId)}/progressions`, { cache: "no-store" })
      .then((res) => res.json() as Promise<Response>)
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setGroups(data.groups ?? []);
      })
      .catch(() => { if (!cancelled) setError("Could not load progressions."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar md:px-8">
      <header className="mx-auto mb-4 flex max-w-6xl items-center gap-3">
        <Link href="/site-walk/walks" className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-base font-black md:text-lg">Progression Timeline</h1>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Before / after & multi-step captures grouped by location</p>
        </div>
      </header>

      {!projectId && (
        <p className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">Open this page from a project context (e.g. <code>/site-walk/progression?projectId=...</code>) or pick a project from the Site Walk dashboard.</p>
      )}

      {loading && (
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading progressions…
        </div>
      )}

      {error && !loading && (
        <p className="mx-auto max-w-6xl rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">{error}</p>
      )}

      {projectId && !loading && !error && groups.length === 0 && (
        <p className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">No progression chains yet. In the capture bottom sheet, tap <strong>Link to Previous (Progression)</strong> to start one.</p>
      )}

      <div className="mx-auto grid max-w-6xl gap-4 pb-6">
        {groups.map((group) => (
          <GlassCard key={group.location} className="p-4">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--graphite-primary)]">{group.location}</h2>
            <ol className="flex flex-wrap gap-3">
              {group.items.map((item, index) => (
                <li key={item.id} className="flex w-44 shrink-0 flex-col gap-2">
                  <Link href={`/site-walk/items/${item.id}/compare`} className="block">
                    <ProgressionThumb item={item} />
                  </Link>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Step {index + 1} · {new Date(item.created_at).toLocaleDateString()}</div>
                  <div className="line-clamp-2 text-xs font-black text-white">{item.title || "Untitled"}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[color-mix(in_srgb,var(--graphite-primary)_80%,transparent)]">{item.item_relationship}</div>
                </li>
              ))}
            </ol>
          </GlassCard>
        ))}
      </div>
      </div>
    </div>
  );
}

function ProgressionThumb({ item }: { item: SiteWalkItem }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!item.file_id) return;
    let cancelled = false;
    fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(item.file_id)}&mode=preview`, { cache: "no-store" })
      .then((res) => res.json() as Promise<{ url?: string }>)
      .then((data) => { if (!cancelled) setUrl(data.url ?? null); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [item.file_id]);
  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
      {url ? <img src={url} alt={item.title} className="h-full w-full object-cover" /> : (
        <div className="flex h-full w-full items-center justify-center text-slate-500"><ImageOff className="h-5 w-5" /></div>
      )}
    </div>
  );
}
