"use client";

import Link from "next/link";
import { Compass, FileText, MapPin, Palette, type LucideIcon } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";

/**
 * AppsGrid — Command Center
 *
 * Renders the user's subscribed Slate360 apps as equally-weighted cards.
 * - Entitlement-gated: only shows apps the org is subscribed to.
 * - Adaptive layout: grid columns adjust to the count so layout stays balanced.
 * - No app takes precedence — all cards share identical sizing and styling.
 */

interface AppCard {
  key: string;
  name: string;
  tagline: string;
  href: string;
  icon: LucideIcon;
  entitlement: keyof Entitlements;
  comingSoon?: boolean;
}

const APPS: AppCard[] = [
  {
    key: "site-walk",
    name: "Site Walk",
    tagline: "Capture context. Create deliverables.",
    href: "/site-walk",
    icon: MapPin,
    entitlement: "canAccessStandalonePunchwalk",
  },
  {
    key: "tours",
    name: "360 Tours",
    tagline: "Immersive walkthroughs with project context.",
    href: "/apps/360-tour-builder",
    icon: Compass,
    entitlement: "canAccessStandaloneTourBuilder",
    comingSoon: true,
  },
  {
    key: "design-studio",
    name: "Design Studio",
    tagline: "Connected 2D and 3D design review.",
    href: "/apps/design-studio",
    icon: Palette,
    entitlement: "canAccessStandaloneDesignStudio",
    comingSoon: true,
  },
  {
    key: "content-studio",
    name: "Content Studio",
    tagline: "Branded media and content delivery.",
    href: "/apps/content-studio",
    icon: FileText,
    entitlement: "canAccessStandaloneContentStudio",
    comingSoon: true,
  },
];

interface AppsGridProps {
  entitlements: Entitlements | null;
}

/** Map count → balanced Tailwind column classes (no app gets precedence). */
function gridColsForCount(count: number): string {
  switch (count) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 sm:grid-cols-2";
    case 3:
      return "grid-cols-1 sm:grid-cols-3";
    case 4:
    default:
      return "grid-cols-2 lg:grid-cols-4";
  }
}

export function AppsGrid({ entitlements: _entitlements }: AppsGridProps) {
  // Beta: surface all apps for every signed-in user. Entitlement gating returns
  // post-beta — keep the prop wired so the switch is a one-line change.
  const visible = APPS;

  if (visible.length === 0) {
    return (
      <section className="rounded-2xl border border-app bg-app-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground mb-2">Your Apps</h2>
        <div className="rounded-2xl border border-dashed border-app bg-white/[0.02] px-4 py-8 text-sm text-muted-foreground text-center">
          No apps in your subscription yet.{" "}
          <Link href="/pricing" className="text-teal hover:underline">
            View plans
          </Link>
        </div>
      </section>
    );
  }

  const cols = gridColsForCount(visible.length);

  return (
    <section className="surface-raised p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Your Apps</h2>
        <span className="text-xs text-muted-foreground">
          {visible.length} subscribed
        </span>
      </div>
      <div className={`grid gap-3 ${cols}`}>
        {visible.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.key}
              href={app.href}
              className="surface-raised-interactive group relative flex flex-col items-start gap-3 p-4"
            >
              {app.comingSoon && (
                <span className="absolute right-3 top-3 rounded-full border border-app bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coming Soon
                </span>
              )}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-cobalt-hover">
                  {app.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {app.tagline}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
