import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { DashboardV2EmptyState } from "./DashboardV2EmptyState";

interface DashboardV2AppLauncherProps {
  entitlements: Entitlements | null;
  /**
   * isSlateCeo is received but intentionally unused for the Twin tile.
   * Track B must provide a real /ceo/twin route before the tile is wired.
   * When Track B ships: gate with isSlateCeo and add AppTile href="/ceo/twin".
   */
  isSlateCeo: boolean;
}

export function DashboardV2AppLauncher({
  entitlements,
}: DashboardV2AppLauncherProps) {
  const hasSiteWalk = entitlements?.canAccessStandalonePunchwalk ?? false;

  return (
    <section
      className="rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-3 backdrop-blur-xl"
      aria-label="Your Apps"
    >
      <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-400/90">
        Your Apps
      </p>

      {hasSiteWalk ? (
        <Link
          href="/site-walk"
          className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 transition-colors hover:border-amber-500/30 hover:bg-white/[0.06] active:bg-white/[0.09]"
          aria-label="Open Site Walk"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-white">Site Walk</p>
            <p className="text-xs text-zinc-500">Field capture &amp; deliverables</p>
          </div>
        </Link>
      ) : (
        /*
         * Slate360 Twin tile intentionally absent — no real Digital Twin route
         * exists yet. Track B must provide the route before this changes.
         */
        <DashboardV2EmptyState
          message="No apps are active for this account."
          actionLabel="View plans"
          actionHref="/more/billing"
        />
      )}
    </section>
  );
}
