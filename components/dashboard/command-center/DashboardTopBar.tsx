"use client";

import { useState } from "react";
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
import { Bell, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 h-16 bg-white border-b border-slate-200 transition-all duration-300",
        isSidebarOpen ? "lg:left-64" : "lg:left-0"
      )}
    >
      <div className="flex h-full items-center gap-3 px-4">
        {/* Hamburger / logo area */}
        <div className="flex shrink-0 items-center gap-2">
          {showLogo && (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              aria-label="Slate360 home"
            >
              <span className="text-base font-bold text-slate-900 tracking-tight select-none">
                Slate<span className="text-blue-600">360</span>
              </span>
            </Link>
          )}
          <button
            onClick={onMenuClick}
            aria-label="Toggle sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <BackButton className="h-9 w-9 rounded-lg border border-slate-200 bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
        </div>

        {/* Global search bar — centred in remaining space */}
        <div className="flex-1 flex justify-center">
          <div
            className={cn(
              "relative flex items-center w-full max-w-md rounded-xl border bg-slate-50 transition-all duration-200",
              searchFocused
                ? "border-blue-400 ring-3 ring-blue-100 bg-white"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <Search
              className={cn(
                "absolute left-3 h-4 w-4 shrink-0 transition-colors",
                searchFocused ? "text-blue-500" : "text-slate-400"
              )}
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search projects, people, files…"
              aria-label="Global search"
              className="h-10 w-full bg-transparent pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <BetaFeedbackButton isEligible={isBetaEligible} />
          <InviteShareButton />

          {/* Notification bell */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                asChild
              >
                <a href="/my-account?tab=notifications" aria-label="Notifications">
                  <Bell className="h-4.5 w-4.5" />
                  {/* unread dot — rendered only when there are notifications */}
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" aria-hidden="true" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Notifications</TooltipContent>
          </Tooltip>

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="User menu"
              >
                <Avatar className="h-9 w-9 border-2 border-blue-200">
                  <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-slate-900">{userName || "My Account"}</DropdownMenuLabel>
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
