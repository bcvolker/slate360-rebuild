"use client";

import {
  MoreVertical,
  Search,
  Bell,
  Share2,
  MessageSquarePlus,
  User,
  Settings,
  CreditCard,
  Building2,
  MessageSquare,
  HelpCircle,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileShellBrand, MobileTopBar } from "@/components/mobile-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { mobileTokens } from "@/components/mobile-system/mobileTokens";

type HeaderAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

type SiteWalkV1HeaderProps = {
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  overflowActions?: HeaderAction[];
  showAvatar?: boolean;
  /** Show the full header tool row (Search, Notifications, Share, Feedback). */
  showToolIcons?: boolean;
  className?: string;
};

export function SiteWalkV1Header({
  primaryAction,
  overflowActions,
  showAvatar = false,
  showToolIcons = false,
  className,
}: SiteWalkV1HeaderProps) {
  return (
    <MobileTopBar
      hideTitle
      className={className}
      leftSlot={<MobileShellBrand href="/app" />}
      rightSlot={
        <>
          {primaryAction && (
            <Button
              size="sm"
              onClick={primaryAction.onClick}
              className={mobileTokens.mobilePrimaryButton}
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
              <DropdownMenuContent align="end" className="border-white/10 bg-[#0B0F15]">
                {overflowActions.map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.onClick}
                    className={cn("text-zinc-300", action.destructive && "text-red-400")}
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {showToolIcons && (
            <div className="flex items-center -mr-1.5">
              <ToolIcon icon={Bell} label="Notifications" />
              <ToolIcon icon={Share2} label="Share" className="hidden min-[400px]:flex" />
              <ToolIcon icon={MessageSquarePlus} label="Feedback" />
            </div>
          )}

          {showAvatar && <AvatarMenu />}
        </>
      }
    />
  );
}

function ToolIcon({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof Search;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(mobileTokens.mobileHeaderToolIcon, className)}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}

function AvatarMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex size-11 shrink-0 items-center justify-center"
        >
          <span className={mobileTokens.mobileAvatarRing}>
            S
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[180px] border-white/10 bg-[#0B0F15]"
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
        <DropdownMenuItem className="gap-2 text-zinc-300 min-[400px]:hidden">
          <Share2 className="size-4" /> Share / Invite
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 text-zinc-300 cursor-pointer">
          <Link href="/app"><ArrowLeft className="size-4" /> Back to Slate360</Link>
        </DropdownMenuItem>
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
