"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { useSiteWalkSession } from "./SiteWalkSessionProvider";
import { SessionExitModal } from "./SessionExitModal";
import { SyncStatusBadge } from "./SyncStatusBadge";

export function WalkHeader() {
  const { session, syncState, isOnline, isEnding, exitWalk, endWalk } = useSiteWalkSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsed = useMemo(() => {
    const started = session.started_at ? Date.parse(session.started_at) : now;
    const minutes = Math.max(0, Math.floor((now - started) / 60_000));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, [now, session.started_at]);

  return (
    <>
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-300 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Act 2 capture</p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-900">{session.title}</h1>
          <p className="mt-1 text-sm text-slate-700">
            {session.is_ad_hoc ? "Ad-hoc walk" : session.project_name ?? "Project-bound walk"} · elapsed {elapsed}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge isOnline={isOnline} syncState={syncState} />
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:border-blue-300 hover:text-blue-800">
            <LogOut className="h-4 w-4" /> End / Exit
          </button>
        </div>
      </section>

      <SessionExitModal
        open={modalOpen}
        ending={isEnding}
        onClose={() => setModalOpen(false)}
        onExit={() => exitWalk("dashboard")}
        onEnd={() => { void endWalk(); }}
      />
    </>
  );
}
