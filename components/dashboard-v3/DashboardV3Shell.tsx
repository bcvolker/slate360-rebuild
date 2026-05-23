"use client";

import Link from "next/link";
import { useState } from "react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { DashboardV3FeedbackModal } from "@/components/dashboard-v3/DashboardV3FeedbackModal";

type DashboardV3ShellProps = {
  workspaceName?: string | null;
};

const WORKSPACE_CARDS = [
  {
    emoji: "📷",
    title: "Open Site Walk Workspace",
    description: "Mobile field capture, plan pinning, and visual reporting.",
    href: "/site-walk",
  },
  {
    emoji: "🌐",
    title: "Open Digital Twin Studio",
    description: "Immersive 3D environments, panoramas, and reality capture review.",
    href: "/product/digital-twin",
  },
] as const;

export function DashboardV3Shell({ workspaceName }: DashboardV3ShellProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0B0F15] text-[#F8FAFC]">
      <header className="flex h-20 items-center justify-between border-b border-white/[0.05] px-6 lg:px-10">
        <Link href="/" aria-label="Slate360 home">
          <Slate360Logo variant="dark" className="text-lg" />
        </Link>
        {workspaceName ? (
          <p className="truncate text-sm text-[#A3AED0]">{workspaceName}</p>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
        <h1 className="text-center text-3xl font-bold tracking-tight text-[#FFFFFF]">
          Slate360 Workspace
        </h1>
        <p className="mt-3 text-center text-sm text-[#A3AED0]">
          Choose your workspace. Site Walk is the primary field engine for Phase 1 release.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {WORKSPACE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex min-h-[220px] flex-col justify-between rounded-xl border border-white/[0.08] bg-slate-900/40 p-8 backdrop-blur-sm transition-all hover:border-[#00E699]/40 hover:bg-slate-900/60 active:scale-[0.99]"
            >
              <div>
                <span className="text-3xl" aria-hidden>{card.emoji}</span>
                <h2 className="mt-4 text-xl font-bold text-[#FFFFFF]">{card.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#A3AED0]">{card.description}</p>
              </div>
              <span className="mt-6 inline-flex w-fit rounded-xl bg-[#00E699] px-5 py-2.5 text-sm font-semibold text-[#0B0F15] transition-colors group-hover:bg-[#00CC88]">
                Enter
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/[0.05] px-6 py-6 text-center">
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="text-sm font-medium text-[#00E699] transition-colors hover:text-[#00CC88]"
        >
          Send Feedback
        </button>
      </footer>

      <DashboardV3FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
