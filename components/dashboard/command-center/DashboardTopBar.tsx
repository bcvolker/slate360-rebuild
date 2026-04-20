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
import { SlateLogo } from "@/components/shared/SlateLogo";
import { InviteShareButton } from "@/components/shared/InviteShareButton";
import { HelpFeedbackButton } from "@/components/shared/HelpFeedbackButton";

interface DashboardTopBarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  userName: string;
  showLogo?: boolean;
  /** @deprecated retained for backward compatibility; HelpFeedbackButton is universal */
  isBetaEligible?: boolean;
}

export function DashboardTopBar({
  onMenuClick,
  isSidebarOpen,
  userName,
  showLogo = false,
}: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 h-16 bg-glass border-b border-glass transition-all duration-300",
        isSidebarOpen ? "lg:left-64" : "lg:left-0"
      )}
    >
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Left: Optional logo (only when sidebar is collapsed) + Menu Toggle */}
        <div className="flex items-center gap-3">
          {showLogo && (
            <Link href="/dashboard" className="hidden sm:flex items-center" aria-label="Slate360 home">
              <SlateLogo className="h-6 w-auto" />
            </Link>
          )}
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/[0.04] hover:bg-teal-soft border border-app hover:border-teal text-zinc-300 hover:text-teal transition-all"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <HelpFeedbackButton />
          <InviteShareButton />
          {/* Notification Bell — no hardcoded count */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-teal-soft hover:text-teal"
                asChild
              >
                <a href="/my-account?tab=notifications">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-glass border-glass">
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-glass border-glass">
              <DropdownMenuLabel className="text-foreground">{userName || "My Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem asChild className="hover:bg-teal-soft hover:text-teal cursor-pointer">
                <a href="/my-account">My Account</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="hover:bg-teal-soft hover:text-teal cursor-pointer">
                <a href="/my-account?tab=billing">Billing &amp; Payments</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                className="hover:bg-destructive/10 hover:text-destructive cursor-pointer"
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
