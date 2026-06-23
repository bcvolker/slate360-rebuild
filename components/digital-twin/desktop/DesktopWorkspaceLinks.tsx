"use client";

import Link from "next/link";
import { IconEdit, IconMap, IconMovie, IconTimeline } from "@tabler/icons-react";
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
    { href: `${base}/floor-plan`, label: "Floor plan", icon: IconMap },
  ];

  return (
    <div className="hidden md:block">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Desktop Studio
      </p>
      <nav
        className="flex flex-wrap gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2"
        aria-label="Desktop twin workstation"
      >
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              "border border-transparent text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-zinc-200",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
