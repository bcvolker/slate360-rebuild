"use client";

import { Bell, Link2, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useInviteShare } from "@/components/shared/InviteShareProvider";
import { BetaFeedbackButton } from "@/components/shared/BetaFeedbackButton";

interface DashboardV2TopBarProps {
  userName: string;
  userInitial: string;
  isBetaEligible: boolean;
  onSearchClick: () => void;
}

function IconBtn({
  onClick,
  href,
  label,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const cls = cn(
    "flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400",
    "hover:bg-white/[0.06] hover:text-zinc-100 transition-colors",
  );
  if (href) return <Link href={href} className={cls} aria-label={label}>{children}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {children}
    </button>
  );
}

export function DashboardV2TopBar({
  userName,
  userInitial,
  isBetaEligible,
  onSearchClick,
}: DashboardV2TopBarProps) {
  const { setOpen: openInvite } = useInviteShare();

  return (
    <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 z-30 items-center justify-between px-5 border-b border-white/10 bg-[#0B0F15]/90 backdrop-blur-xl">
      {/* Left — section title placeholder; Slice 2 will pass a dynamic title */}
      <p className="text-sm font-semibold text-zinc-300">Dashboard</p>

      {/* Right — icon controls */}
      <div className="flex items-center gap-1">
        <BetaFeedbackButton isEligible={isBetaEligible} />

        <IconBtn label="Search (⌘K)" onClick={onSearchClick}>
          <Search className="h-4 w-4" />
        </IconBtn>

        <IconBtn label="Invite & Share" onClick={() => openInvite(true)}>
          <Link2 className="h-4 w-4" />
        </IconBtn>

        {/* Bell routes to coordination inbox until a dedicated notifications page exists */}
        <IconBtn label="Notifications" href="/coordination/inbox">
          <Bell className="h-4 w-4" />
        </IconBtn>

        {/* Avatar — minimal initial pill; Slice 4 will add a dropdown */}
        <Link
          href="/more"
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-400/25 hover:border-amber-400/50 transition-colors"
          aria-label={`Account — ${userName}`}
          title={userName}
        >
          {userInitial}
        </Link>
      </div>
    </header>
  );
}
