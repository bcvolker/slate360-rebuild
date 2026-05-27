"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { AppWindow, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export type InstalledAppCard = {
  id: string;
  title: string;
  subtext: string;
  href: string;
  icon: ElementType;
  borderClass: string;
  iconWrapperClass: string;
  iconClass: string;
};

export const INSTALLED_APPS: InstalledAppCard[] = [
  {
    id: "site-walk",
    title: "Site Walk",
    subtext: "Capture photos and map pins to plans.",
    href: "/site-walk",
    icon: Camera,
    borderClass: "border-[#00E699]",
    iconWrapperClass: "border border-[#00E699]/20 bg-[#00E699]/10",
    iconClass: "text-[#00E699]",
  },
  {
    id: "digital-twin",
    title: "Digital Twin",
    subtext: "Interactive 3D reality studio.",
    href: "/digital-twin",
    icon: AppWindow,
    borderClass: "border-[#6EA7A0]/35",
    iconWrapperClass: "border border-[#6EA7A0]/20 bg-[#6EA7A0]/10",
    iconClass: "text-[#6EA7A0]",
  },
];

function AppLauncherCard({ app }: { app: InstalledAppCard }) {
  const Icon = app.icon;

  return (
    <Link
      href={app.href}
      className={cn(
        "flex min-h-[148px] flex-col gap-3 rounded-xl border bg-slate-900/40 p-4",
        "transition-all hover:bg-slate-900/55 active:scale-[0.99]",
        app.borderClass,
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          app.iconWrapperClass,
        )}
      >
        <Icon className={cn("h-5 w-5", app.iconClass)} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-[#FFFFFF]">{app.title}</p>
        <p className="mt-1 line-clamp-1 text-xs leading-snug text-zinc-400">{app.subtext}</p>
      </div>
    </Link>
  );
}

export function MobileAppLauncherGrid({ apps = INSTALLED_APPS }: { apps?: InstalledAppCard[] }) {
  const count = apps.length;

  if (count === 0) {
    return null;
  }

  if (count === 1) {
    return <AppLauncherCard app={apps[0]!} />;
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {apps.map((app) => (
          <AppLauncherCard key={app.id} app={app} />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {apps.slice(0, 2).map((app) => (
            <AppLauncherCard key={app.id} app={app} />
          ))}
        </div>
        <div className="flex justify-center">
          <div className="w-[calc((100%-0.75rem)/2)]">
            <AppLauncherCard app={apps[2]!} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {apps.slice(0, 4).map((app) => (
        <AppLauncherCard key={app.id} app={app} />
      ))}
    </div>
  );
}
