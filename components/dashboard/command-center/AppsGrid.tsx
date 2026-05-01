"use client";

import Link from "next/link";
import { Compass, FileText, MapPin, Palette, type LucideIcon } from "lucide-react";
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

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-300 bg-white p-2 shadow-sm">
      <div className="mb-1 flex items-center justify-center">
        <h2 className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-blue-700">Apps</h2>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 place-content-center place-items-center gap-1.5 overflow-hidden sm:gap-2">
        {visible.map((app) => {
          const Icon = app.icon;
          const hasAccess = !app.entitlement || (_entitlements?.[app.entitlement] ?? false);
          const card = (
            <div
              className={`group relative flex h-16 w-28 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-300 bg-slate-50 p-2 text-center shadow-sm transition-all duration-200 hover:border-blue-500 hover:bg-blue-50 sm:h-20 sm:w-32 lg:h-20 lg:w-36 ${hasAccess ? "" : "opacity-70"}`}
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="truncate text-xs font-black text-slate-900 group-hover:text-blue-700 sm:text-sm">
                  {app.name}
                </h3>
                <p className="hidden text-[10px] leading-3 text-slate-600 lg:line-clamp-1 lg:block">
                  {app.tagline}
                </p>
              </div>
            </div>
          );

          return hasAccess ? (
            <Link
              key={app.key}
              href={app.href}
              className="block"
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
