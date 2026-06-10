"use client";

import Link from "next/link";
import { Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHeaderActionsProps = {
  className?: string;
};

/** Header icon cluster — Bell (inbox) and Account only; neutral graphite chrome. */
export function MobileHeaderActions({ className }: MobileHeaderActionsProps) {
  const iconButtonClass = cn(mobileTokens.mobileHeaderIconButton, mobileTokens.focusRing);

  return (
    <div className={cn(mobileTokens.mobileHeaderActionsRow, className)}>
      <Link href="/coordination/inbox" className={iconButtonClass} aria-label="Notifications and alerts">
        <Bell className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </Link>

      <Link href="/more/account" className={iconButtonClass} aria-label="Account settings">
        <User className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
