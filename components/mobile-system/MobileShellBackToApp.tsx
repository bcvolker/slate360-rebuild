"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileShellBackToAppProps = {
  className?: string;
};

/**
 * In-app back control for module shells — returns to Slate360 home (/app).
 */
export function MobileShellBackToApp({ className }: MobileShellBackToAppProps) {
  return (
    <Link
      href="/app"
      aria-label="Back to Slate360"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.22)] transition-colors hover:border-amber-500/55 hover:bg-amber-500/15 hover:text-amber-200",
        mobileTokens.focusRing,
        className,
      )}
    >
      <ArrowLeft className="size-6" strokeWidth={2.5} aria-hidden />
    </Link>
  );
}
