"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bug, ChevronDown, Share2 } from "lucide-react";
import { BetaFeedbackModal } from "@/components/shared/BetaFeedbackModal";
import { cn } from "@/lib/utils";

type Props = {
  projectName?: string;
  backHref?: string;
  overflowItems?: { label: string; onClick: () => void; danger?: boolean }[];
  onProjectClick?: () => void;
  userInitials: string;
  orgName: string | null;
};

/**
 * Mobile-first top bar for Site Walk module.
 * Layout: [← Back] [Project Name ▾] [··· Overflow]
 * Per redesign spec — replaces crowded multi-icon header.
 */
export function SiteWalkTopBar({
  projectName = "Site Walk",
  backHref,
  onProjectClick,
  userInitials,
  orgName,
}: Props) {
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  async function shareCurrentView() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "Slate360 Site Walk", url });
      else await navigator.clipboard.writeText(url);
      setShareMessage("Link copied");
      window.setTimeout(() => setShareMessage(null), 1800);
    } catch {
      setShareMessage("Share unavailable");
      window.setTimeout(() => setShareMessage(null), 1800);
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-app",
        "bg-app-page/85 backdrop-blur-xl px-2 sm:px-3"
      )}
    >
      <button
        type="button"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onProjectClick}
        className="flex flex-1 items-center gap-1 truncate rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100"
      >
        <span className="truncate text-base font-black text-slate-950">
          {projectName}
        </span>
        {onProjectClick && <ChevronDown className="h-4 w-4 shrink-0 text-slate-600" />}
      </button>

      {shareMessage && <span className="hidden rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800 sm:inline-flex">{shareMessage}</span>}
      <button type="button" onClick={() => setFeedbackOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950" aria-label="Report a bug">
        <Bug className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => void shareCurrentView()} className="hidden h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-black text-white transition hover:bg-blue-700 sm:inline-flex" aria-label="Share this Site Walk view">
        <Share2 className="h-4 w-4" /> Share
      </button>
      <Link href="/settings" className="flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-300 bg-white px-2 text-xs font-black text-slate-950" aria-label={`Open settings for ${orgName ?? "organization"}`}>
        {userInitials}
      </Link>

      {/* Hidden link kept so router-less back stays available */}
      {backHref && (
        <Link href={backHref} className="sr-only">
          Back to dashboard
        </Link>
      )}
      <BetaFeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </header>
  );
}
