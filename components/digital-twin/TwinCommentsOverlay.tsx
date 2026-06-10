"use client";

import { ChevronDown, MessageSquare, MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onToggle: () => void;
  count: number;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function TwinCommentsOverlay({
  open,
  onToggle,
  count,
  title = "Comments",
  children,
  className,
}: Props) {
  return (
    <div className={cn("pointer-events-auto flex flex-col", className)}>
      {!open ? (
        <button
          type="button"
          onClick={onToggle}
          className="relative inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] text-zinc-200 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
          aria-expanded={false}
          aria-label={`${title}${count > 0 ? ` (${count})` : ""}`}
          title={title}
          data-twin-chrome="viewer-overflow"
        >
          <MoreHorizontal className="size-4" aria-hidden />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[var(--twin360-blue)] text-[9px] font-bold text-[var(--graphite-canvas)]">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      ) : (
        <div
          className={cn(
            "flex max-h-[min(52vh,420px)] w-[min(18rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl",
            "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[min(55dvh,480px)] max-md:w-full max-md:rounded-b-none max-md:rounded-t-2xl",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <MessageSquare className={cn("size-4", twinAccent.text)} aria-hidden />
              <p className="text-xs font-semibold text-zinc-100">{title}</p>
              {count > 0 ? (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300">
                  {count}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
              aria-label="Collapse comments"
            >
              <span className="hidden md:inline">
                <ChevronDown className="size-4" aria-hidden />
              </span>
              <span className="md:hidden">
                <X className="size-4" aria-hidden />
              </span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">{children}</div>
        </div>
      )}
    </div>
  );
}
