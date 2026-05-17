"use client";

import { Bell, Link2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SlateLogo } from "@/components/shared/SlateLogo";
import { useInviteShare } from "@/components/shared/InviteShareProvider";

interface DashboardV2MobileHeaderProps {
  userName: string;
  userInitial: string;
}

export function DashboardV2MobileHeader({
  userName,
  userInitial,
}: DashboardV2MobileHeaderProps) {
  const { setOpen: openInvite } = useInviteShare();

  const iconCls = cn(
    "flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400",
    "hover:bg-white/[0.06] hover:text-zinc-100 transition-colors",
  );

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 border-b border-white/10 bg-[#0B0F15]/90 backdrop-blur-xl"
      aria-label="Mobile header"
    >
      {/* Logo */}
      <Link href="/dashboard" aria-label="Slate360 home">
        <SlateLogo size="sm" />
      </Link>

      {/* Icon controls */}
      <div className="flex items-center gap-0.5">
        {/* Bell routes to coordination inbox until a dedicated notifications page exists */}
        <Link
          href="/coordination/inbox"
          className={iconCls}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => openInvite(true)}
          className={iconCls}
          aria-label="Invite & Share"
        >
          <Link2 className="h-4 w-4" />
        </button>

        {/* Avatar link */}
        <Link
          href="/more"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-400/25"
          aria-label={`Account — ${userName}`}
          title={userName}
        >
          {userInitial}
        </Link>
      </div>
    </header>
  );
}
