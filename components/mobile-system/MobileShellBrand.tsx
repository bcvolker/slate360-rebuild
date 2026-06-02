"use client";

import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { cn } from "@/lib/utils";

type MobileShellBrandProps = {
  /** Home target for the brand cluster. Platform + module shells use /app. */
  href?: string;
  className?: string;
  iconClassName?: string;
  /** When true, omit the Slate360 word label (icon only — rare). */
  iconOnly?: boolean;
};

/**
 * Canonical Slate360 brand for mobile app shells — green emblem matches PWA install icon.
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
      className={cn("flex min-w-0 items-center", className)}
      aria-label="Slate360 home"
    >
      {iconOnly ? (
        <SlateIcon className={cn("h-9 w-9 shrink-0", iconClassName)} />
      ) : (
        <Slate360Logo
          variant="dark"
          size="header"
          showWordmark
          className={iconClassName}
        />
      )}
    </Link>
  );
}
