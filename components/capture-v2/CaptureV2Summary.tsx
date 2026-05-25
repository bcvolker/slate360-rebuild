"use client";

import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, FolderKanban, ListChecks } from "lucide-react";
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
  justFinished?: boolean;
  savedCount?: number | null;
};

export function CaptureV2Summary({ session, items, stats, justFinished = false, savedCount = null }: Props) {
  const orderedItems = [...items].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const contextLabel = session.isAdHoc ? "Quick Walk" : session.projectName ?? "Plan Walk";
  const displaySavedCount = savedCount ?? stats.totalItems;
  const savedItems = justFinished
    ? orderedItems.slice(Math.max(0, orderedItems.length - Math.max(displaySavedCount, 0)))
    : orderedItems;

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

        {justFinished ? (
          <div className="mx-auto mt-4 max-w-6xl rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-emerald-100">Walk finished</p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-100/80">
                  {displaySavedCount > 0
                    ? `${displaySavedCount} capture${displaySavedCount === 1 ? "" : "s"} saved to this walk.`
                    : "Walk marked complete. Add captures anytime from Site Walk."}
                </p>
                {savedItems.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-950/20 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/80">
                      <ListChecks className="h-3.5 w-3.5" />
                      Saved captures
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {savedItems.map((item, index) => (
                        <li
                          key={item.id}
                          className="truncate text-sm font-semibold text-emerald-50/95"
                        >
                          {index + 1}. {item.title?.trim() || item.description?.trim() || "Capture"}
                        </li>
                      ))}
                    </ul>
                    {orderedItems.length > savedItems.length ? (
                      <p className="mt-2 text-[11px] font-semibold text-emerald-100/70">
                        Plus {orderedItems.length - savedItems.length} earlier capture
                        {orderedItems.length - savedItems.length === 1 ? "" : "s"} on this walk.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.projectId ? (
                    <Link
                      href={`/projects/${encodeURIComponent(session.projectId)}/field`}
                      className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 text-xs font-black text-emerald-50"
                    >
                      <FolderKanban className="h-3.5 w-3.5" />
                      {session.projectName ? `Back to ${session.projectName}` : "Back to project"}
                    </Link>
                  ) : null}
                  <Link
                    href="/site-walk/walks"
                    className="inline-flex min-h-9 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-slate-200"
                  >
                    Walk list
                  </Link>
                  {orderedItems.length > 0 ? (
                    <a
                      href="#walk-captures"
                      className="inline-flex min-h-9 items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 text-xs font-black text-emerald-50"
                    >
                      View all captures
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

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
        <section id="walk-captures" className="min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
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
                  highlight={justFinished && savedItems.some((saved) => saved.id === item.id)}
                />
              ))
            )}
          </div>
        </section>

        <aside className="shrink-0 border-t border-white/10 bg-slate-950/50 px-4 py-4 md:w-80 md:border-l md:border-t-0">
          <div className="space-y-5 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <CaptureV2SummaryStats stats={stats} sessionStatus={session.status} />
            <CaptureV2SummaryActions
              sessionId={session.id}
              sessionStatus={session.status}
              projectId={session.projectId}
              projectName={session.projectName}
            />
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
