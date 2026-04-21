"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, MoreVertical, Square } from "lucide-react";

/**
 * LiveWalkShell — Phase 3 of Site Walk redesign.
 *
 * Provides the floating chrome for an active capture session:
 *   - Top bar: [← Exit] [Walk title] [···]
 *   - Bottom safe-area is reserved for the toast + future capture FAB
 *
 * This component is rendered INSIDE the AppShell `fullBleed` branch,
 * which already removes the global sidebar/topbar/bottom-nav.
 *
 * Body is a 100dvh column: top bar + scrollable content. The content
 * itself owns the camera/upload tiles and the captured-items feed.
 */
export function LiveWalkShell({
  title,
  exitHref = "/site-walk/walks",
  onEndSession,
  children,
}: {
  title: string;
  exitHref?: string;
  onEndSession?: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background overflow-hidden">
      <header
        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/60 backdrop-blur shrink-0"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <Link
          href={exitHref}
          aria-label="Exit walk"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-400">Live</p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Walk menu"
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-12 z-50 w-44 rounded-xl border border-white/10 bg-zinc-950 shadow-2xl py-1">
                {onEndSession && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEndSession();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:bg-white/5 text-left"
                  >
                    <Square className="h-4 w-4" /> End session
                  </button>
                )}
                <Link
                  href={exitHref}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  <ArrowLeft className="h-4 w-4" /> Back to walks
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    </div>
  );
}
