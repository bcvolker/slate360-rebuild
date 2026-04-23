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
import { BackButton } from "@/components/shared/BackButton";
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
  isBetaEligible = false,
  onSearchClick,
}: MobileTopBarProps) {
  const { setOpen: openInviteShare } = useInviteShare();

  return (
    <header
      className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-30",
        "h-14 bg-header-glass",
        "border-b border-header",
        "px-2 max-w-full overflow-hidden"
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 items-center justify-between gap-1 min-w-0 overflow-hidden">
        {/* Left: back button (auto-hides on root) + cobalt icon */}
        <div className="flex items-center min-w-0 flex-shrink-0 gap-1">
          <BackButton />
          <Link
            href="/dashboard"
            className="flex items-center"
            aria-label="Slate360 home"
          >
            <img
              src="/uploads/slate360-icon-cobalt-v2.svg?v=cobalt-2026-04-21b"
              alt="Slate360"
              width={36}
              height={36}
              className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]"
            />
          </Link>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search"
            className="hidden xs:flex h-9 w-9 items-center justify-center rounded-lg text-header-muted hover:text-cobalt hover:bg-header-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          <BetaFeedbackButton isEligible={isBetaEligible} />
          {/* Mobile-only: obvious QR/share button → opens Invite & Share modal */}
          <button
            type="button"
            onClick={() => openInviteShare(true)}
            aria-label="Invite & Share — get QR code"
            className="sm:hidden h-9 w-9 flex items-center justify-center rounded-lg bg-cobalt/15 text-cobalt border border-cobalt/40 hover:bg-cobalt/25 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg relative"
          >
            <QrCode className="h-[18px] w-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cobalt animate-pulse" />
          </button>
          {/* Desktop pill version (hidden < sm) */}
          <InviteShareButton />

          <Link
            href="/my-account?tab=notifications"
            aria-label="Notifications"
            className="hidden xs:flex h-9 w-9 items-center justify-center rounded-lg text-header-muted hover:text-cobalt hover:bg-header-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="h-9 w-9 flex items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg"
            >
              <Avatar className="h-8 w-8 border border-cobalt/40">
                <AvatarFallback className="bg-cobalt/15 text-cobalt text-[12px] font-semibold">
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuLabel className="text-header text-xs">
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
