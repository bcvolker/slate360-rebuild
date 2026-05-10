"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Camera, ClipboardList, FileText, HardHat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

type Props = {
  orgName?: string | null;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/site-walk", label: "Workspace", icon: HardHat, match: (path) => path === "/site-walk" },
  { href: "/site-walk/walks", label: "Walks", icon: ClipboardList, match: (path) => path.startsWith("/site-walk/walks") },
  { href: "/site-walk/capture", label: "Capture", icon: Camera, match: (path) => path.startsWith("/site-walk/capture") },
  { href: "/site-walk/reports", label: "Deliverables", icon: FileText, match: (path) => path.startsWith("/site-walk/reports") || path.startsWith("/site-walk/deliverables") },
];

export function SiteWalkModuleNav({ orgName }: Props) {
  const pathname = usePathname() ?? "/site-walk";

  return (
    <div className="sticky top-0 z-30 bg-[#0B0F15]/92 px-3 pt-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <GlassCard className="mx-auto flex max-w-7xl flex-col gap-3 rounded-[1.5rem] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">Site Walk</p>
          <p className="truncate text-xs font-bold text-slate-400">{orgName ?? "Field workspace"}</p>
          {pathname !== "/site-walk" && (
            <Link href="/site-walk" className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-slate-200 transition hover:border-amber-400/60 hover:text-amber-200">
              <ArrowLeft className="h-3.5 w-3.5" /> Site Walk Home
            </Link>
          )}
        </div>
        <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-slate-950/55 p-1" aria-label="Site Walk sections">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-black transition sm:min-w-24 sm:flex-row sm:text-xs",
                  active
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.22)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-amber-200",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </GlassCard>
    </div>
  );
}
