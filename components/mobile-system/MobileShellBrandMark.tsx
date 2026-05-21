"use client";

import Link from "next/link";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { cn } from "@/lib/utils";

type MobileShellBrandMarkProps = {
  /** Home target for the brand mark. Mobile platform shell uses /app. */
  href?: string;
  className?: string;
  iconClassName?: string;
};

/**
 * Canonical Slate360 brand mark for mobile app shells (platform + module apps).
 * Uses SlateIcon (S-mark) — not the horizontal SlateLogo wordmark.
 */
export function MobileShellBrandMark({
  href = "/app",
  className,
  iconClassName,
}: MobileShellBrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn("flex shrink-0 items-center", className)}
      aria-label="Slate360 home"
    >
      <SlateIcon
        className={cn(
          "h-9 w-9 rounded-lg drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]",
          iconClassName,
        )}
      />
    </Link>
  );
}
