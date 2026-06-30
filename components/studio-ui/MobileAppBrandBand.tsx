import type { ComponentType, SVGProps } from "react";
import { mobileTokens } from "@/components/mobile-system/mobileTokens";
import { cn } from "@/lib/utils";

type MobileAppBrandBandProps = {
  /** App name shown as the prominent wordmark (e.g. "Site Walk", "Twin 360"). */
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Route accent: "primary" (Site Walk green) | "info" (Twin 360 blue). */
  accent: "primary" | "info";
};

/**
 * App-name branding band — rendered as the FIRST child of each app home's content (below the
 * platform header), so each sub-app (Site Walk / Twin 360) gets real branding instead of a tiny
 * name crammed into the header. Accent-tinted icon chip + IBM Plex Mono uppercase wordmark.
 * Tokens only (no hardcoded hex). See docs/CAPTURE_AND_SHELL_BLOCKERS_LOG.md (Blocker 3).
 */
export function MobileAppBrandBand({ name, icon: Icon, accent }: MobileAppBrandBandProps) {
  const chipClass =
    accent === "info"
      ? mobileTokens.mobileModuleHomeIconChipInfo
      : mobileTokens.mobileModuleHomeIconChipPrimary;

  return (
    <div className="flex shrink-0 items-center gap-3 pb-1">
      <span className={cn(chipClass, "size-10")} aria-hidden>
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <h1 className="font-mono text-lg font-bold uppercase tracking-[0.14em] leading-none text-[var(--graphite-text-header)]">
        {name}
      </h1>
    </div>
  );
}
