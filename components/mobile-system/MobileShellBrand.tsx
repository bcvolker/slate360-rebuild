"use client";

import Link from "next/link";
import { SlateLogo } from "@/components/shared/SlateLogo";
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
      <SlateLogo size="sm" className={cn("shrink-0", iconClassName)} />
    </Link>
  );
}

type MobileShellModuleBrandProps = ModuleHomeBrand;

/** Module home header brand — Slate360 platform mark + divider + accent chip + module name. */
export function MobileShellModuleBrand({ name, icon: Icon, accent }: MobileShellModuleBrandProps) {
  const chipClass =
    accent === "info"
      ? mobileTokens.mobileModuleHomeIconChipInfo
      : mobileTokens.mobileModuleHomeIconChipPrimary;

  return (
    <div className={mobileTokens.mobileModuleHomeBrandCluster}>
      <Link
        href="/app"
        className={mobileTokens.mobileHeaderPlatformMarkLink}
        aria-label="Slate360 home"
      >
        <SlateLogo size="sm" className="shrink-0" aria-hidden />
      </Link>
      <span className={mobileTokens.mobileHeaderBrandDivider} aria-hidden />
      <span className={chipClass} aria-hidden>
        <Icon className={mobileTokens.mobileModuleHomeIconChipIcon} strokeWidth={2} />
      </span>
      <span className={mobileTokens.mobileModuleHomeName}>{name}</span>
    </div>
  );
}
