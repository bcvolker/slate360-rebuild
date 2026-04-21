"use client";

/**
 * MobileTopBar — slim app-style top bar for mobile (≤lg).
 *
 * Logo (cobalt icon + workspace name) · global search trigger · Invite & Share
 * · Beta feedback · Notifications bell · Avatar dropdown.
 *
 * Mirrors the desktop DashboardTopBar capabilities but in a compact,
 * thumb-friendly layout. Mounted in AppShell behind a lg:hidden wrapper.
 */

import Link from "next/link";
import { Bell, Search, QrCode } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InviteShareButton } from "@/components/shared/InviteShareButton";
import { BetaFeedbackButton } from "@/components/shared/BetaFeedbackButton";
import { useInviteShare } from "@/components/shared/InviteShareProvider";
import { cn } from "@/lib/utils";

interface MobileTopBarProps {
  userName: string;
  workspaceName?: string;
  isBetaEligible?: boolean;
  onSearchClick?: () => void;
}

export function MobileTopBar({
  userName,
  workspaceName,
  isBetaEligible = false,
  onSearchClick,
}: MobileTopBarProps) {
  const display = workspaceName?.trim() || userName?.trim() || "Slate360";
  const { setOpen: openInviteShare } = useInviteShare();

  return (
    <header
      className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-30",
        "h-14 bg-[#0B0F15]/85 backdrop-blur-xl",
        "border-b border-white/5",
        "px-3"
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 items-center justify-between gap-2">
        {/* Left: cobalt icon + workspace label */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 min-w-0 flex-shrink-0"
          aria-label="Slate360 home"
        >
          <img
            src="/slate360-icon-color.png"
            alt=""
            className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]"
            aria-hidden="true"
          />
          <span className="text-[12px] font-semibold text-slate-200 tracking-wide truncate max-w-[110px]">
            {display}
          </span>
        </Link>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-cobalt hover:bg-white/5 transition-colors"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          <BetaFeedbackButton isEligible={isBetaEligible} />
          {/* Mobile-only: obvious QR/share button → opens Invite & Share modal */}
          <button
            type="button"
            onClick={() => openInviteShare(true)}
            aria-label="Invite & Share — get QR code"
            className="sm:hidden h-9 w-9 flex items-center justify-center rounded-lg bg-cobalt/15 text-cobalt border border-cobalt/40 hover:bg-cobalt/25 transition-colors relative"
          >
            <QrCode className="h-[18px] w-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cobalt animate-pulse" />
          </button>
          {/* Desktop pill version (hidden < sm) */}
          <InviteShareButton />

          <Link
            href="/my-account?tab=notifications"
            aria-label="Notifications"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-cobalt hover:bg-white/5 transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="h-9 w-9 flex items-center justify-center rounded-full"
            >
              <Avatar className="h-8 w-8 border border-cobalt/40">
                <AvatarFallback className="bg-cobalt/15 text-cobalt text-[12px] font-semibold">
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#151A23] border-white/10">
              <DropdownMenuLabel className="text-foreground text-xs">
                {userName || "My Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem asChild className="text-xs hover:bg-cobalt/10 hover:text-cobalt cursor-pointer">
                <Link href="/my-account">My Account</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs hover:bg-cobalt/10 hover:text-cobalt cursor-pointer">
                <Link href="/my-account?tab=billing">Billing &amp; Payments</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                className="text-xs hover:bg-destructive/10 hover:text-destructive cursor-pointer"
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
        </div>
      </div>
    </header>
  );
}

export default MobileTopBar;
