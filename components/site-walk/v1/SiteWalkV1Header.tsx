"use client";

import {
  ArrowLeft,
  MoreVertical,
  Search,
  Bell,
  User,
  Settings,
  CreditCard,
  Building2,
  MessageSquare,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type HeaderAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

type SiteWalkV1HeaderProps = {
  title: string;
  onBack?: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  overflowActions?: HeaderAction[];
  showAvatar?: boolean;
  className?: string;
};

export function SiteWalkV1Header({
  title,
  onBack,
  primaryAction,
  overflowActions,
  showAvatar = false,
  className,
}: SiteWalkV1HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center gap-2 border-b border-white/10 bg-zinc-900/80 px-4 backdrop-blur-sm",
        className,
      )}
    >
      {onBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Go back"
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white">
        {title}
      </h1>

      {primaryAction && (
        <Button
          size="sm"
          onClick={primaryAction.onClick}
          className="rounded-lg bg-amber-600 text-white hover:bg-amber-700"
        >
          {primaryAction.label}
        </Button>
      )}

      {overflowActions && overflowActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More actions"
              className="text-zinc-400 hover:text-white"
            >
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-white/10 bg-zinc-900"
          >
            {overflowActions.map((action) => (
              <DropdownMenuItem
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "text-zinc-300",
                  action.destructive && "text-red-400",
                )}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showAvatar && <AvatarMenu />}
    </header>
  );
}

/* --- Avatar / profile dropdown --- */

function AvatarMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-600/20 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-600/30"
        >
          S
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[180px] border-white/10 bg-zinc-900"
      >
        <DropdownMenuItem className="gap-2 text-zinc-300">
          <User className="size-4" /> Account
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-zinc-300">
          <Settings className="size-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-zinc-300">
          <CreditCard className="size-4" /> Billing
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-zinc-300">
          <Building2 className="size-4" /> Organization
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-zinc-300">
          <MessageSquare className="size-4" /> Feedback
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-zinc-300">
          <HelpCircle className="size-4" /> Help
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-red-400">
          <LogOut className="size-4" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
