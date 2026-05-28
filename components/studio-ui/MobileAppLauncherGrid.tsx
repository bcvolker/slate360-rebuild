"use client";

import type { ElementType } from "react";
import { AppWindow, Camera } from "lucide-react";
import {
  MobileHomeActionCard,
  MobileHomeActionGrid,
  mobileTokens,
} from "@/components/mobile-system";

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

function AppLauncherCard(props: {
  title: string;
  subtext: string;
  icon: ElementType;
  href: string;
}) {
  return (
    <MobileHomeActionCard
      title={props.title}
      subtext={props.subtext}
      icon={props.icon}
      href={props.href}
      className={mobileTokens.appHomeLauncherCard}
      iconWrapperClassName={mobileTokens.appHomeLauncherIconWrapper}
      iconClassName={mobileTokens.appHomeLauncherIcon}
      titleClassName={mobileTokens.appHomeLauncherTitle}
      subtextClassName={mobileTokens.appHomeLauncherSubtitle}
    />
  );
}

export function MobileAppLauncherGrid({ apps = INSTALLED_APPS }: { apps?: InstalledAppCard[] }) {
  const count = apps.length;

  if (count === 0) {
    return null;
  }

  if (count === 1) {
    return (
      <AppLauncherCard
        title={apps[0]!.title}
        subtext={apps[0]!.subtext}
        icon={apps[0]!.icon}
        href={apps[0]!.href}
      />
    );
  }

  if (count === 3) {
    return (
      <div className="flex flex-col gap-3">
        <MobileHomeActionGrid className={mobileTokens.appHomeLauncherGrid}>
          {apps.slice(0, 2).map((app) => (
            <AppLauncherCard
              key={app.id}
              title={app.title}
              subtext={app.subtext}
              icon={app.icon}
              href={app.href}
            />
          ))}
        </MobileHomeActionGrid>
        <div className="flex justify-center">
          <div className="w-[calc((100%-0.75rem)/2)]">
            <AppLauncherCard
              title={apps[2]!.title}
              subtext={apps[2]!.subtext}
              icon={apps[2]!.icon}
              href={apps[2]!.href}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobileHomeActionGrid className={mobileTokens.appHomeLauncherGrid}>
      {apps.slice(0, count === 2 ? 2 : 4).map((app) => (
        <AppLauncherCard
          key={app.id}
          title={app.title}
          subtext={app.subtext}
          icon={app.icon}
          href={app.href}
        />
      ))}
    </MobileHomeActionGrid>
  );
}
