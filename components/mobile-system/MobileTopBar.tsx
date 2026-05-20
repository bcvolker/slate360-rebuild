"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MobileTopBarProps = {
  title: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backHref?: string;
  onBack?: () => void;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
};

export function MobileTopBar({
  title,
  subtitle,
  titleClassName,
  subtitleClassName,
  backHref,
  onBack,
  leftSlot,
  rightSlot,
  className,
}: MobileTopBarProps) {
  const backControl = backHref ? (
    <Link
      href={backHref}
      aria-label="Go back"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
    >
      <ArrowLeft className="size-5" />
    </Link>
  ) : onBack ? (
    <button
      type="button"
      onClick={onBack}
      aria-label="Go back"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
    >
      <ArrowLeft className="size-5" />
    </button>
  ) : null;

  return (
    <header
      className={cn(
        "shrink-0 lg:hidden border-b border-white/10 bg-[#0B0F15]/88 px-3 shadow-lg backdrop-blur-md",
        className,
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 overflow-hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leftSlot ?? backControl}
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "truncate text-[16px] font-semibold leading-tight tracking-tight text-white",
                titleClassName
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  "truncate text-[11px] font-bold uppercase leading-tight tracking-[0.1em] text-zinc-400 mt-0.5",
                  subtitleClassName
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {rightSlot && <div className="flex shrink-0 items-center">{rightSlot}</div>}
      </div>
    </header>
  );
}