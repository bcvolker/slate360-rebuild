"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { cn } from "@/lib/utils";
import type { ModuleHomeBrand } from "./mainMobileTabs";
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
 * Canonical Slate360 brand for mobile app shells — icon + wordmark on /app.
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
      className={cn(mobileTokens.mobileHeaderBrandLink, className)}
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

type MobileShellModuleBrandProps = ModuleHomeBrand;

/** Module home header brand — back chevron, 28px accent icon chip, app name. */
export function MobileShellModuleBrand({ name, icon: Icon, accent }: MobileShellModuleBrandProps) {
  const chipClass =
    accent === "info"
      ? mobileTokens.mobileModuleHomeIconChipInfo
      : mobileTokens.mobileModuleHomeIconChipPrimary;

  return (
    <Link
      href="/app"
      className={mobileTokens.mobileModuleHomeBrandLink}
      aria-label="Back to Slate360 home"
    >
      <ChevronLeft
        className={mobileTokens.mobileHeaderBackChevron}
        strokeWidth={2}
        aria-hidden
      />
      <span className={chipClass} aria-hidden>
        <Icon className={mobileTokens.mobileModuleHomeIconChipIcon} strokeWidth={2} />
      </span>
      <span className={mobileTokens.mobileModuleHomeName}>{name}</span>
    </Link>
  );
}
