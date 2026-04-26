"use client";

/**
 * MobileTopBar — slim app-style top bar for mobile (≤lg).
 *
 * Logo (cobalt icon + workspace name) · global search trigger · Invite & Share
 * · Version 1 feedback · Coordination notifications bell · Avatar dropdown.
 *
 * Mirrors the desktop DashboardTopBar capabilities but in a compact,
 * thumb-friendly layout. Mounted in AppShell behind a lg:hidden wrapper.
 */

import { useState } from "react";
import Link from "next/link";
import { Bell, Bug, ChevronDown, Search, Share2 } from "lucide-react";
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
  workspaceName = "Slate360",
  isBetaEligible = false,
  onSearchClick,
}: MobileTopBarProps) {
  const { setOpen: openInviteShare } = useInviteShare();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <header
      className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-50",
        "h-14 bg-header-glass",
        "border-b border-header",
        "px-2 max-w-full overflow-hidden"
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 items-center justify-between gap-1 min-w-0 overflow-hidden">
        {/* Left: back button (auto-hides on root) + cobalt icon + workspace selector */}
        <div className="flex items-center min-w-0 flex-shrink gap-1">
          <BackButton />
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center"
            aria-label="Slate360 home"
          >
            <img
              src="/uploads/slate360-icon-cobalt-v2.svg?v=v1-shell"
              alt="Slate360"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]"
            />
          </Link>
          <button
            type="button"
            aria-label="Workspace and account switcher"
            className="flex min-h-10 min-w-0 items-center gap-1 rounded-lg px-1.5 text-left hover:bg-header-hover transition-colors"
          >
            <span className="max-w-[88px] truncate text-xs font-semibold text-header">
              {workspaceName || userName || "Workspace"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-header-muted" />
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => openInviteShare(true)}
            aria-label="Invite and Share"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-header-muted hover:text-cobalt hover:bg-header-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg"
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-header-muted hover:text-cobalt hover:bg-header-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          {isBetaEligible && (
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              aria-label="Report a bug or suggest a feature for Version 1"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-header-muted hover:text-cobalt hover:bg-header-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg"
            >
              <Bug className="h-[18px] w-[18px]" />
            </button>
          )}

          <Link
            href="/coordination"
            aria-label="Notifications and coordination hub"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-header-muted hover:text-cobalt hover:bg-header-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/50 focus-visible:ring-offset-1 focus-visible:ring-offset-header-bg"
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
      <BetaFeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </header>
  );
}

export default MobileTopBar;
