"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SlateLogoOnLight } from "@/components/shared/SlateLogoOnLight";
import { InviteShareButton } from "@/components/shared/InviteShareButton";
import { BetaFeedbackButton } from "@/components/shared/BetaFeedbackButton";
import { BackButton } from "@/components/shared/BackButton";

interface DashboardTopBarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  userName: string;
  showLogo?: boolean;
  isBetaEligible?: boolean;
}

export function DashboardTopBar({
  onMenuClick,
  isSidebarOpen,
  userName,
  showLogo = false,
  isBetaEligible = false,
}: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 h-16 border-b border-white/10 bg-[#0B0F15]/85 text-slate-50 shadow-lg backdrop-blur-xl transition-all duration-300",
        isSidebarOpen ? "lg:left-64" : "lg:left-0"
      )}
    >
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Left: Optional logo (only when sidebar is collapsed) + Menu Toggle */}
        <div className="flex items-center gap-3">
          {showLogo && (
            <Link href="/dashboard" className="hidden sm:flex items-center" aria-label="Slate360 home">
              <SlateLogoOnLight className="h-6 w-auto" />
            </Link>
          )}
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-white/15 bg-white/5 text-slate-200 transition-colors duration-200 hover:border-blue-400/60 hover:bg-white/10 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BackButton className="h-10 w-10 rounded-xl border border-white/15 bg-white/5 text-slate-200 transition-colors duration-200 hover:border-blue-400/60 hover:bg-white/10 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]" />
        </div>

        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <BetaFeedbackButton isEligible={isBetaEligible} />
          <InviteShareButton />
          {/* Notification Bell — no hardcoded count */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]"
                asChild
              >
                <Link href="/coordination/inbox">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-cobalt/40">
                  <AvatarFallback className="bg-blue-600/20 text-blue-200">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{userName || "My Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="/my-account">My Account</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="/my-account?tab=billing">Billing &amp; Payments</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
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
