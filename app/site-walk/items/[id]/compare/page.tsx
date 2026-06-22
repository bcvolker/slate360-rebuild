"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Loader2 } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import type { SiteWalkItem } from "@/lib/types/site-walk";

type ComparisonResponse = { before: SiteWalkItem | null; after: SiteWalkItem | null; error?: string };

export default function CompareItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pair, setPair] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/site-walk/items/${encodeURIComponent(id)}/comparison`, { cache: "no-store" })
      .then((res) => res.json() as Promise<ComparisonResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setPair(data);
      })
      .catch(() => { if (!cancelled) setError("Could not load comparison."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-slate-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar md:px-8">
      <header className="mx-auto mb-4 flex max-w-6xl items-center gap-3">
        <Link href="/site-walk" className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-base font-black md:text-lg">Before / After</h1>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Side-by-side site walk capture comparison</p>
        </div>
      </header>

      {loading && (
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading comparison…
        </div>
      )}

      {error && !loading && (
        <p className="mx-auto max-w-6xl rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">{error}</p>
      )}

      {pair && !loading && (
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          <ComparisonPane label="Before" item={pair.before} />
          <ComparisonPane label="After" item={pair.after} />
        </div>
      )}

      {pair && !pair.before && !pair.after && !loading && (
        <p className="mx-auto mt-6 max-w-6xl rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">No paired item found. Link this capture to a previous one from the bottom sheet to enable before/after.</p>
      )}
      </div>
    </div>
  );
}

function ComparisonPane({ label, item }: { label: string; item: SiteWalkItem | null }) {
  return (
    <GlassCard className="overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--graphite-primary)]">{label}</span>
        {item && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{new Date(item.created_at).toLocaleString()}</span>}
      </div>
      {!item ? (
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/30 text-xs text-slate-500">No capture yet</div>
      ) : (
        <PaneImage item={item} />
      )}
      {item && (
        <div className="mt-3 space-y-1">
          <h2 className="text-sm font-black text-white">{item.title || "Untitled"}</h2>
          {item.location_label && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--graphite-primary)]">{item.location_label}</p>}
          {item.description && <p className="text-xs leading-5 text-slate-300">{item.description}</p>}
        </div>
      )}
    </GlassCard>
  );
}

function PaneImage({ item }: { item: SiteWalkItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item.file_id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(item.file_id)}&mode=preview`, { cache: "no-store" })
      .then((res) => res.json() as Promise<{ url?: string }>)
      .then((data) => { if (!cancelled) setUrl(data.url ?? null); })
      .catch(() => { if (!cancelled) setUrl(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [item.file_id]);

  if (!item.file_id) {
    return <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xs text-slate-500"><ImageIcon className="mr-2 h-4 w-4" /> No photo on this item</div>;
  }
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black">
      {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></div>}
      {url && <img src={url} alt={item.title} className="h-full w-full object-contain" />}
    </div>
  );
}
