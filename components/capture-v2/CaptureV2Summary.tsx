"use client";

import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { buildCaptureV2LaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { CaptureV2SummaryActions } from "./CaptureV2SummaryActions";
import { CaptureV2SummaryItemCard } from "./CaptureV2SummaryItemCard";
import { CaptureV2SummaryStats } from "./CaptureV2SummaryStats";
import type {
  CaptureV2SummaryItem,
  CaptureV2SummarySession,
  CaptureV2SummaryStats as Stats,
} from "./capture-v2-summary-types";

type Props = {
  session: CaptureV2SummarySession;
  items: CaptureV2SummaryItem[];
  stats: Stats;
};

export function CaptureV2Summary({ session, items, stats }: Props) {
  const orderedItems = [...items].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const contextLabel = session.isAdHoc ? "Quick Walk" : session.projectName ?? "Plan Walk";

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#0B0F15]/92 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/site-walk/walks"
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-black text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Walks
          </Link>
          {session.status !== "completed" && (
            <Link
              href={buildCaptureV2LaunchUrl({ session: session.id, plan: "skip" })}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950"
            >
              Resume capture
            </Link>
          )}
        </div>

        <div className="mx-auto mt-4 max-w-6xl">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
            Walk Review
          </p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
            {session.title}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-400">
            {contextLabel} · {stats.totalItems} capture{stats.totalItems === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden md:flex-row">
        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
          <div className="space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
            {orderedItems.length === 0 ? (
              <EmptySummary sessionId={session.id} />
            ) : (
              orderedItems.map((item, index) => (
                <CaptureV2SummaryItemCard
                  key={item.id}
                  sessionId={session.id}
                  item={item}
                  stopNumber={index + 1}
                />
              ))
            )}
          </div>
        </section>

        <aside className="shrink-0 border-t border-white/10 bg-slate-950/50 px-4 py-4 md:w-80 md:border-l md:border-t-0">
          <div className="space-y-5 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <CaptureV2SummaryStats stats={stats} sessionStatus={session.status} />
            <CaptureV2SummaryActions sessionId={session.id} sessionStatus={session.status} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function EmptySummary({ sessionId }: { sessionId: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-amber-400/20 bg-white/[0.04] p-6 text-center">
      <Camera className="mx-auto h-8 w-8 text-amber-300" />
      <h2 className="mt-3 text-xl font-black">No captures yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-bold text-slate-400">
        This walk has no saved stops. Return to capture to add photos or notes.
      </p>
      <Link
        href={buildCaptureV2LaunchUrl({ session: sessionId, plan: "skip", quick: "camera" })}
        className="mt-5 inline-flex rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950"
      >
        Capture first photo
      </Link>
    </div>
  );
}
