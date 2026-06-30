"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHeaderActionsProps = {
  className?: string;
};

/**
 * Header icon cluster — Account only; neutral graphite chrome. The notifications Bell was
 * removed to de-crowd the 360px header: notifications stay reachable from the Activity
 * bottom-nav tab (same target, /coordination/inbox). One fewer button in the right cluster.
 */
export function MobileHeaderActions({ className }: MobileHeaderActionsProps) {
  const iconButtonClass = cn(mobileTokens.mobileHeaderIconButton, mobileTokens.focusRing);

  return (
    <div className={cn(mobileTokens.mobileHeaderActionsRow, className)}>
      <Link href="/more/account" className={iconButtonClass} aria-label="Account settings">
        <User className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
