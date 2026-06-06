"use client";

import Link from "next/link";
import { IconEdit, IconMovie, IconTimeline } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { isDigitalTwinDesktopEnabled } from "@/lib/digital-twin/desktop-feature";

export function DesktopWorkspaceLinks({ spaceId }: { spaceId: string }) {
  if (!isDigitalTwinDesktopEnabled()) return null;

  const base = `/digital-twin/twins/${spaceId}`;
  const links = [
    { href: `${base}/editor`, label: "Splat editor", icon: IconEdit },
    { href: `${base}/cinematic`, label: "Cinematic path", icon: IconMovie },
    { href: `${base}/progression`, label: "Progression", icon: IconTimeline },
  ];

  return (
    <nav
      className="hidden flex-wrap gap-2 md:flex"
      aria-label="Desktop twin workstation"
    >
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(twinAccent.button, "inline-flex items-center gap-1.5 text-xs")}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
