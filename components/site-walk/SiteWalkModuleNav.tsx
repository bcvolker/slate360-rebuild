"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MobileShellBrand, MobileTopBar } from "@/components/mobile-system";

type Props = {
  orgName?: string | null;
};

export function resolveSiteWalkRouteTitle(pathname: string): string {
  if (pathname.startsWith("/site-walk/setup")) return "Setup";
  if (pathname.startsWith("/site-walk/walks/") && pathname !== "/site-walk/walks") {
    return "Walk Review";
  }
  if (pathname.startsWith("/site-walk/walks")) return "Walks";
  if (pathname.startsWith("/site-walk/deliverables")) return "Deliverables";
  if (pathname.startsWith("/site-walk/reports")) return "Reports";
  if (pathname.startsWith("/site-walk/assigned-work")) return "Assigned Work";
  if (pathname.startsWith("/site-walk/progression")) return "Progress";
  if (pathname.startsWith("/site-walk/items")) return "Items";
  if (pathname.startsWith("/site-walk/more")) return "More";
  if (pathname.startsWith("/site-walk/slatedrop")) return "SlateDrop";
  if (pathname.startsWith("/site-walk/capture")) return "Capture";
  return "Site Walk";
}

/** Sub-route header for non-home Site Walk pages inside MobileAppShell. */
export function SiteWalkSubRouteHeader({ orgName }: Props) {
  const pathname = usePathname() ?? "/site-walk";
  const title = resolveSiteWalkRouteTitle(pathname);

  return (
    <MobileTopBar
      title={title}
      subtitle={orgName ?? "Field workspace"}
      leftSlot={
        <Link
          href="/site-walk"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-amber-400/40 hover:text-amber-100"
        >
          <ArrowLeft className="size-3.5" />
          Home
        </Link>
      }
      rightSlot={<MobileShellBrand href="/app" iconClassName="h-7 w-7" />}
    />
  );
}

/** @deprecated Use SiteWalkSubRouteHeader via SiteWalkShell. Kept for import compatibility. */
export function SiteWalkModuleNav({ orgName }: Props) {
  return <SiteWalkSubRouteHeader orgName={orgName} />;
}
