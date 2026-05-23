"use client";

import Link from "next/link";
import { type LucideIcon, MapPin } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { shouldHideInAppStoreMode } from "@/lib/app-store-mode";

/**
 * AppsGrid — Command Center
 *
 * Compact app launcher tiles. Each tile shows the app name, a short tagline,
 * and an amber icon badge. Apps the user has not subscribed to are shown
 * dimmed with an "Available" badge so users discover the ecosystem.
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
    tagline: "Field capture & deliverables",
    href: "/site-walk",
    icon: MapPin,
    entitlement: "canAccessStandalonePunchwalk",
  },
];

interface AppsGridProps {
  entitlements: Entitlements | null;
}

export function AppsGrid({ entitlements }: AppsGridProps) {
  const visible = APPS.filter((app) => {
    if (shouldHideInAppStoreMode(app.comingSoon)) return false;
    const hasAccess = !app.entitlement || (entitlements?.[app.entitlement] ?? false);
    return hasAccess;
  });

  if (visible.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-700/60 bg-slate-900/60 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/70 mb-2">Your Apps</p>
        <div className="rounded-2xl border border-dashed border-slate-700/60 px-4 py-8 text-sm text-slate-500 text-center">
          No apps in your subscription yet.{" "}
          <Link href="/pricing" className="text-amber-400 hover:underline">
            View plans
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-700/60 bg-slate-900/60 p-3 shadow-lg backdrop-blur-md">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/70">Your Apps</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {visible.map((app) => {
          const Icon = app.icon;
          const hasAccess = !app.entitlement || (entitlements?.[app.entitlement] ?? false);

          const tile = (
            <div
              className={`group relative flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-3xl border p-2 text-center transition-all duration-200 sm:h-24
                ${hasAccess
                  ? "border-slate-700/60 bg-slate-950/45 hover:border-amber-400/50 hover:bg-amber-500/10 cursor-pointer"
                  : "border-slate-700/40 bg-slate-950/30 opacity-60 cursor-default"
                }`}
            >
              {!hasAccess && (
                <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
                  Available
                </span>
              )}
              {app.comingSoon && hasAccess && (
                <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
                  Soon
                </span>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-0.5 px-1">
                <h3 className="truncate text-xs font-black text-slate-50 group-hover:text-amber-100 sm:text-sm">
                  {app.name}
                </h3>
                <p className="hidden text-[10px] leading-3 text-slate-400 lg:line-clamp-1 lg:block">
                  {app.tagline}
                </p>
              </div>
            </div>
          );

          return hasAccess ? (
            <Link key={app.key} href={app.href} className="block" aria-label={`Open ${app.name}`}>
              {tile}
            </Link>
          ) : (
            <div key={app.key} aria-label={`${app.name} — not in your subscription`}>
              {tile}
            </div>
          );
        })}
      </div>
    </section>
  );
}
