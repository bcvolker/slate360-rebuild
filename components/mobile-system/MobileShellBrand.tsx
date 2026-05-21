"use client";

import Link from "next/link";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileShellBrandProps = {
  /** Home target for the brand cluster. Platform + module shells use /app. */
  href?: string;
  className?: string;
  iconClassName?: string;
  /** When true, omit the Slate360 word label (icon only — rare). */
  iconOnly?: boolean;
};

/**
 * Canonical Slate360 brand for mobile app shells: S-mark + “Slate360” label.
 * Use in /app and module shells (/site-walk, etc.) so headers match exactly.
 */
export function MobileShellBrand({
  href = "/app",
  className,
  iconClassName,
  iconOnly = false,
}: MobileShellBrandProps) {
  return (
    <Link
      href={href}
      className={cn("flex min-w-0 items-center gap-2.5", className)}
      aria-label="Slate360 home"
    >
      <SlateIcon
        className={cn(
          "h-9 w-9 shrink-0 rounded-lg drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]",
          iconClassName,
        )}
      />
      {!iconOnly && (
        <span className={cn("truncate", mobileTokens.shellBrandLabel)}>Slate360</span>
      )}
    </Link>
  );
}
