"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Bug, Search, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BetaFeedbackModal } from "@/components/shared/BetaFeedbackModal";
import { useInviteShare } from "@/components/shared/InviteShareProvider";
import { MobileShellBrand, MobileTopBar } from "@/components/mobile-system";

type PlatformMobileTopBarProps = {
  userName: string;
  workspaceName?: string;
  isBetaEligible?: boolean;
  onSearchClick?: () => void;
};

export function PlatformMobileTopBar({
  userName,
  isBetaEligible = false,
  onSearchClick,
}: PlatformMobileTopBarProps) {
  const { setOpen: openInviteShare } = useInviteShare();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <MobileTopBar
        hideTitle
        leftSlot={<MobileShellBrand href="/app" />}
        rightSlot={
          <>
            <HeaderIcon label="Invite to Slate360" onClick={() => openInviteShare(true)} icon={Share2} />
            <HeaderIcon label="Search" onClick={onSearchClick} icon={Search} />
            {isBetaEligible && (
              <HeaderIcon label="Report a bug or suggest a feature for Version 1" onClick={() => setFeedbackOpen(true)} icon={Bug} />
            )}
            <Link
              href="/more"
              aria-label="Notifications and communication inbox"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/10 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <AccountMenu userName={userName} />
          </>
        }
      />
      <BetaFeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}

function HeaderIcon({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Search;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/10 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function AccountMenu({ userName }: { userName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        <Avatar className="h-8 w-8 border border-amber-500/40">
          <AvatarFallback className="bg-amber-500/15 text-[12px] font-semibold text-amber-200">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0B0F15]/95 text-slate-100 backdrop-blur-md">
        <DropdownMenuLabel className="text-xs text-slate-100">
          {userName || "My Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem asChild className="cursor-pointer text-xs hover:bg-amber-500/10 hover:text-amber-200">
          <Link href="/more/account">Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer text-xs hover:bg-amber-500/10 hover:text-amber-200">
          <Link href="/more/billing">Billing &amp; Apps</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer text-xs hover:bg-amber-500/10 hover:text-amber-200">
          <Link href="/more">Account Hub</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem
          className="cursor-pointer text-xs hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            import("@/lib/supabase/client").then(({ createClient }) => {
              const supabase = createClient();
              supabase.auth.signOut().then(() => {
                window.location.href = "/login";
              });
            });
          }}
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
