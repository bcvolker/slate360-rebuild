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

export function AppsGrid({ entitlements: _entitlements }: AppsGridProps) {
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

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2 flex items-center justify-center">
        <h2 className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Apps</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-3 overflow-hidden">
        {visible.map((app) => {
          const Icon = app.icon;
          const hasAccess = _entitlements?.[app.entitlement] ?? false;
          const card = (
            <div
              className={`group relative flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-3xl border border-slate-300 bg-slate-50 p-3 text-center shadow-sm transition-all duration-200 hover:border-blue-500 hover:bg-blue-50 sm:h-32 sm:w-32 lg:h-36 lg:w-36 ${hasAccess ? "" : "opacity-60"}`}
            >
              {!hasAccess && (
                <span className="absolute right-2 top-2 rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                  Available
                </span>
              )}
              {app.comingSoon && hasAccess && (
                <span className="absolute right-2 top-2 rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                  Soon
                </span>
              )}
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="truncate text-xs font-black text-slate-900 group-hover:text-blue-700 sm:text-sm">
                  {app.name}
                </h3>
                <p className="hidden text-[11px] leading-4 text-slate-600 sm:line-clamp-2 sm:block">
                  {app.tagline}
                </p>
              </div>
            </div>
          );

          return hasAccess ? (
            <Link
              key={app.key}
              href={app.href}
              className="block h-full"
            >
              {card}
            </Link>
          ) : (
            <div key={app.key} aria-disabled="true" className="h-full">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
