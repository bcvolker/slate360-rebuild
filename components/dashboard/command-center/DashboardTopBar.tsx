"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

interface DashboardTopBarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  userName: string;
}

export function DashboardTopBar({ onMenuClick, isSidebarOpen, userName }: DashboardTopBarProps) {
  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 h-16 bg-glass border-b border-glass transition-all duration-300",
        isSidebarOpen ? "lg:left-64" : "lg:left-0"
      )}
    >
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Left: Home + Menu Toggle */}
        <div className="flex items-center gap-3">
          <a href="/" aria-label="Home" className="shrink-0">
            <img src="/uploads/slate360-logo-reversed-v2.svg" alt="Slate360" className="h-6 w-auto" />
          </a>
          <div className="hidden md:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Slate360</p>
            <p className="text-sm font-bold text-white">Command Center</p>
          </div>
          <button
            onClick={onMenuClick}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-primary/20 border border-zinc-700 hover:border-primary/50 text-zinc-300 hover:text-primary transition-all"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Menu</span>
          </button>
        </div>

        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notification Bell — no hardcoded count */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-primary/10 hover:text-primary"
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
              <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                <a href="/my-account">My Account</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="hover:bg-primary/10 hover:text-primary cursor-pointer">
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
