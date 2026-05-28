"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { cn } from "@/lib/utils";
import { MobileHeaderActions } from "./MobileHeaderActions";
import { MobileShellBrand } from "./MobileShellBrand";
import { mobileTokens } from "./mobileTokens";
import type { InviteShareData } from "@/lib/types/invite";

type MobilePlatformHeaderProps = {
  /** Show back chevron before brand — links to /app (module home surfaces). */
  showBackToApp?: boolean;
  /** Sub-route back target (e.g. /site-walk). Replaces brand cluster when set. */
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  inviteShareData?: InviteShareData;
  className?: string;
};

export function MobilePlatformHeader({
  showBackToApp = false,
  backHref,
  backLabel = "Home",
  title,
  subtitle,
  inviteShareData,
  className,
}: MobilePlatformHeaderProps) {
  const hasTitle = Boolean(title || subtitle);

  return (
    <header
      className={cn(mobileTokens.mobileHeaderBar, className)}
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
        ) : showBackToApp ? (
          <Link
            href="/app"
            className={cn(mobileTokens.mobileHeaderBrandLink, "gap-1.5 pr-1")}
            aria-label="Back to Slate360 home"
          >
            <ChevronLeft
              className={mobileTokens.mobileHeaderBackChevron}
              strokeWidth={2}
              aria-hidden
            />
            <SlateIcon
              className={cn("h-9 w-9 shrink-0 rounded-lg", mobileTokens.mobileBrandIconGlow)}
            />
            <span className={cn("truncate", mobileTokens.shellBrandLabel)}>Slate360</span>
          </Link>
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

      <MobileHeaderActions inviteShareData={inviteShareData} />
    </header>
  );
}
