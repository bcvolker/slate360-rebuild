"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { MobileHeaderActions } from "./MobileHeaderActions";
import { MobileShellSwitcher } from "./MobileShellSwitcher";
import type { ModuleHomeBrand } from "./mainMobileTabs";
import { SAFE_AREA_INSET_TOP } from "@/lib/capacitor/safe-area-inset";
import { mobileTokens } from "./mobileTokens";

type MobilePlatformHeaderProps = {
  /** Sub-route back target (e.g. /site-walk). Adds a back button; the Slate360
   *  brand stays visible so branding is consistent on every screen. */
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  moduleHomeBrand?: ModuleHomeBrand | null;
  className?: string;
};

export function MobilePlatformHeader({
  backHref,
  backLabel = "Back",
  title,
  subtitle,
  className,
}: MobilePlatformHeaderProps) {
  const hasTitle = Boolean(title || subtitle);

  return (
    <header
      className={cn(mobileTokens.mobileHeaderBar, className)}
      data-mobile-shell-chrome="header"
      style={{ paddingTop: SAFE_AREA_INSET_TOP }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Consistent back button on every sub-route. */}
        {backHref ? (
          <Link
            href={backHref}
            aria-label={backLabel}
            className={cn(mobileTokens.mobileHeaderBackButton, mobileTokens.focusRing)}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        ) : null}

        {/* Persistent Slate360 brand — always taps back to /app. */}
        <Link
          href="/app"
          className={cn(mobileTokens.mobileHeaderPlatformMarkLink, mobileTokens.focusRing)}
          aria-label="Slate360 home"
        >
          <SlateLogo size="sm" className="shrink-0" aria-hidden />
        </Link>

        {/* App name moved OUT of the header into MobileAppBrandBand (below the header) so each
            sub-app gets real branding — see docs/CAPTURE_AND_SHELL_BLOCKERS_LOG.md (Blocker 3).
            Header stays logo + switcher + account. */}

        {hasTitle ? (
          <div className="min-w-0 flex-1">
            {title ? <h1 className={mobileTokens.mobileHeaderTitle}>{title}</h1> : null}
            {subtitle ? <p className={mobileTokens.mobileHeaderSubtitle}>{subtitle}</p> : null}
          </div>
        ) : null}
      </div>

      <div className={mobileTokens.mobileHeaderActionsRow}>
        <MobileShellSwitcher />
        <MobileHeaderActions />
      </div>
    </header>
  );
}
