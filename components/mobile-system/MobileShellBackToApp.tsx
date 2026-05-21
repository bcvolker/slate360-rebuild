"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileShellBackToAppProps = {
  className?: string;
};

/**
 * In-app back control for module shells — returns to Slate360 home (/app).
 * Not browser back; larger hit target than legacy chevron back.
 */
export function MobileShellBackToApp({ className }: MobileShellBackToAppProps) {
  return (
    <Link
      href="/app"
      aria-label="Back to Slate360"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:border-amber-500/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]",
        className,
      )}
    >
      <ArrowLeft className="size-6" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}
