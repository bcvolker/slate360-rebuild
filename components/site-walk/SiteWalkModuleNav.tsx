"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";

type Props = {
  orgName?: string | null;
};

export function SiteWalkModuleNav({ orgName }: Props) {
  const pathname = usePathname() ?? "/site-walk";

  if (pathname === "/site-walk") return null;

  return (
    <div className="sticky top-0 z-30 bg-[#0B0F15]/92 px-3 pt-2 backdrop-blur-xl sm:px-6 lg:px-8">
      <GlassCard className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">Site Walk</p>
          <p className="truncate text-xs font-bold text-slate-400">{orgName ?? "Field workspace"}</p>
        </div>
        <Link href="/site-walk" className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-slate-200 transition hover:border-amber-400/60 hover:text-amber-200">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
      </GlassCard>
    </div>
  );
}
