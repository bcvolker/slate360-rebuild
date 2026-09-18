"use client";

import Link from "next/link";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { vnextClientHomeHref } from "@/lib/vnext/nav";

type VnextLogoProps = {
  href?: string;
  /**
   * Smaller lockup for headers that also show a section label (owner chrome).
   * Default is the client application-bar size — not the 40px marketing header.
   */
  compact?: boolean;
};

export function VnextLogo({ href = vnextClientHomeHref(), compact = false }: VnextLogoProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center gap-2 py-1"
      aria-label="Slate360 home"
    >
      <SlateIcon
        aria-hidden="true"
        className={compact ? "h-6 w-auto shrink-0" : "h-7 w-auto shrink-0"}
      />
      <span
        className={
          compact
            ? "select-none font-semibold tracking-[0.13em] text-[13.5px] md:text-[14.5px]"
            : "select-none font-semibold tracking-[0.13em] text-[15px] md:text-[16.5px]"
        }
      >
        <span className="text-[var(--vnext-ink)]">SLATE</span>
        <span className="text-[var(--vnext-brand-360)]">360</span>
      </span>
    </Link>
  );
}
