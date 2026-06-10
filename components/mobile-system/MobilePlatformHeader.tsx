"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileHeaderActions } from "./MobileHeaderActions";
import { MobileShellBrand, MobileShellModuleBrand } from "./MobileShellBrand";
import type { ModuleHomeBrand } from "./mainMobileTabs";
import { mobileTokens } from "./mobileTokens";

type MobilePlatformHeaderProps = {
  /** Sub-route back target (e.g. /site-walk). Replaces brand cluster when set. */
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  moduleHomeBrand?: ModuleHomeBrand | null;
  className?: string;
};

export function MobilePlatformHeader({
  backHref,
  backLabel = "Home",
  title,
  subtitle,
  moduleHomeBrand,
  className,
}: MobilePlatformHeaderProps) {
  const hasTitle = Boolean(title || subtitle);

  return (
    <header
      className={cn(mobileTokens.mobileHeaderBar, className)}
      data-mobile-shell-chrome="header"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className={cn(mobileTokens.mobileHeaderSubrouteBack, mobileTokens.focusRing)}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {backLabel}
          </Link>
        ) : moduleHomeBrand ? (
          <MobileShellModuleBrand {...moduleHomeBrand} />
        ) : (
          <MobileShellBrand href="/app" />
        )}

        {hasTitle ? (
          <div className="min-w-0 flex-1">
            {title ? <h1 className={mobileTokens.mobileHeaderTitle}>{title}</h1> : null}
            {subtitle ? <p className={mobileTokens.mobileHeaderSubtitle}>{subtitle}</p> : null}
          </div>
        ) : null}
      </div>

      <MobileHeaderActions />
    </header>
  );
}
