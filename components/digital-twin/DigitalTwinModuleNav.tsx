"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MobileShellBrand, MobileTopBar } from "@/components/mobile-system";

type Props = {
  orgName?: string | null;
};

export function resolveDigitalTwinRouteTitle(pathname: string): string {
  if (pathname.startsWith("/digital-twin/capture")) return "Quick Capture";
  if (pathname.startsWith("/digital-twin/upload")) return "Upload";
  if (pathname.startsWith("/digital-twin/twins")) return "My Twins";
  return "Digital Twin";
}

/** Sub-route header for non-home Digital Twin pages inside MobileAppShell. */
export function DigitalTwinSubRouteHeader({ orgName }: Props) {
  const pathname = usePathname() ?? "/digital-twin";
  const title = resolveDigitalTwinRouteTitle(pathname);

  return (
    <MobileTopBar
      title={title}
      subtitle={orgName ?? "Reality capture workspace"}
      leftSlot={
        <Link
          href="/digital-twin"
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
