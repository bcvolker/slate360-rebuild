"use client";

import Link from "next/link";
import { ArrowRight, Compass, FileText, MapPin, Palette, type LucideIcon } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { shouldHideInAppStoreMode } from "@/lib/app-store-mode";

/**
 * AppsGrid — Command Center
 *
 * Renders the four planned Slate360 apps as compact, equally-weighted tiles.
 * Site Walk remains visible while under development; future apps remain represented
 * so the shell layout is stable as subscriptions and app launches come online.
 */

interface AppCard {
  key: string;
  name: string;
  tagline: string;
  href: string;
  icon: LucideIcon;
  entitlement?: keyof Entitlements;
  comingSoon?: boolean;
}

const APPS: AppCard[] = [
  {
    key: "site-walk",
    name: "Site Walk",
    tagline: "Capture context. Create deliverables.",
    href: "/site-walk",
    icon: MapPin,
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
  const visible = APPS.filter((app) => !shouldHideInAppStoreMode(app.comingSoon));

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

  const singleApp = visible.length === 1;

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 shadow-lg backdrop-blur-md sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Apps</h2>
        {singleApp && <span className="text-[10px] font-bold text-slate-400">Open your active app</span>}
      </div>
      <div className={singleApp ? "grid min-h-0 flex-1 grid-cols-1" : "grid min-h-0 flex-1 grid-cols-2 place-content-center place-items-center gap-2 overflow-hidden"}>
        {visible.map((app) => {
          const Icon = app.icon;
          const hasAccess = !app.entitlement || (_entitlements?.[app.entitlement] ?? false);
          const card = (
            <div
              className={`group relative flex ${singleApp ? "h-full min-h-36 items-start justify-between p-4 text-left" : "h-20 w-full flex-col items-center justify-center gap-1 p-2 text-center sm:h-24"} rounded-3xl border border-white/10 bg-slate-950/45 shadow-lg transition-all duration-200 hover:border-blue-400/70 hover:bg-blue-500/10 ${hasAccess ? "" : "opacity-70"}`}
            >
              {!hasAccess && (
                <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-200">
                  Available
                </span>
              )}
              {app.comingSoon && hasAccess && (
                <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-200">
                  Soon
                </span>
              )}
              <div className={singleApp ? "flex w-full items-center justify-between gap-3" : "contents"}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                {singleApp && <ArrowRight className="h-5 w-5 text-blue-200" />}
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className={singleApp ? "text-2xl font-black text-white" : "truncate text-xs font-black text-slate-50 group-hover:text-blue-100 sm:text-sm"}>
                  {app.name}
                </h3>
                <p className={singleApp ? "max-w-xs text-sm font-bold leading-5 text-slate-300" : "hidden text-[10px] leading-3 text-slate-400 lg:line-clamp-1 lg:block"}>
                  {app.tagline}
                </p>
                {singleApp && <p className="pt-2 text-xs font-black uppercase tracking-[0.14em] text-blue-200">Enter Field-Work Cockpit</p>}
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
            <div key={app.key} aria-disabled="true">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
