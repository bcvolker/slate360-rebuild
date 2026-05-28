"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { AppWindow, Camera } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { cn } from "@/lib/utils";

export type InstalledAppCard = {
  id: string;
  title: string;
  subtext: string;
  href: string;
  icon: ElementType;
};

export const INSTALLED_APPS: InstalledAppCard[] = [
  {
    id: "site-walk",
    title: "Site Walk",
    subtext: "Capture photos and map pins to plans.",
    href: "/site-walk",
    icon: Camera,
  },
  {
    id: "digital-twin",
    title: "Digital Twin",
    subtext: "Interactive 3D reality studio.",
    href: "/digital-twin",
    icon: AppWindow,
  },
];

function AppLauncherCard({ app }: { app: InstalledAppCard }) {
  const Icon = app.icon;

  return (
    <Link
      href={app.href}
      className={cn(mobileTokens.mobileAppLauncherCard, mobileTokens.focusRing)}
    >
      <span className={mobileTokens.mobileAppLauncherIconWrapper} aria-hidden>
        <Icon
          className={mobileTokens.mobileAppLauncherIcon}
          strokeWidth={1.75}
        />
      </span>
      <div className="min-w-0">
        <p className={mobileTokens.mobileAppLauncherTitle}>{app.title}</p>
        <p className={mobileTokens.mobileAppLauncherSubtitle}>{app.subtext}</p>
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
      <div className={mobileTokens.mobileAppLauncherCardGrid}>
        {apps.map((app) => (
          <AppLauncherCard key={app.id} app={app} />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex flex-col gap-3">
        <div className={mobileTokens.mobileAppLauncherCardGrid}>
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
    <div className={mobileTokens.mobileAppLauncherCardGrid}>
      {apps.slice(0, 4).map((app) => (
        <AppLauncherCard key={app.id} app={app} />
      ))}
    </div>
  );
}
