"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MarketingHeader } from "@/components/marketing-launchpad/MarketingHeader";
import { CookieBanner } from "@/components/marketing/CookieBanner";

/** Routes that ship their own top chrome — skip the shared marketing header. */
function shouldSkipMarketingHeader(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/product/")) return true;
  if (pathname.startsWith("/portal/")) return true;
  if (pathname.startsWith("/apps/")) return true;
  if (pathname === "/privacy" || pathname === "/terms") return true;
  if (pathname === "/contact") return true;
  return false;
}

/**
 * Public route chrome — canonical marketing header + cookie notice for (public) routes.
 * Replaces the legacy root ClientHeader + CookieBanner pair.
 */
export function PublicSiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const showHeader = !shouldSkipMarketingHeader(pathname);

  return (
    <>
      {showHeader ? <MarketingHeader variant="default" /> : null}
      {children}
      <CookieBanner />
    </>
  );
}
