"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  projectName?: string;
  backHref?: string;
  overflowItems?: { label: string; onClick: () => void; danger?: boolean }[];
  onProjectClick?: () => void;
};

/**
 * Mobile-first top bar for Site Walk module.
 * Layout: [← Back] [Project Name ▾] [··· Overflow]
 * Per redesign spec — replaces crowded multi-icon header.
 */
export function SiteWalkTopBar({
  projectName = "Site Walk",
  backHref,
  overflowItems = [],
  onProjectClick,
}: Props) {
  const router = useRouter();
  const [overflowOpen, setOverflowOpen] = useState(false);

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
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onProjectClick}
        className="flex flex-1 items-center gap-1 truncate rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.04] transition-colors"
      >
        <span className="truncate text-base font-semibold text-foreground">
          {projectName}
        </span>
        {onProjectClick && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {overflowItems.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOverflowOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors"
            aria-label="More options"
            aria-expanded={overflowOpen}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {overflowOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setOverflowOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 top-full mt-1 z-40 min-w-[12rem] rounded-xl border border-app bg-app-card shadow-xl overflow-hidden">
                {overflowItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.onClick();
                      setOverflowOpen(false);
                    }}
                    className={cn(
                      "block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.04]",
                      item.danger ? "text-red-400" : "text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden link kept so router-less back stays available */}
      {backHref && (
        <Link href={backHref} className="sr-only">
          Back to dashboard
        </Link>
      )}
    </header>
  );
}
