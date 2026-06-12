"use client";

import type { ReactNode } from "react";
import { appHomeTokens } from "@/components/studio-ui/app-home-tokens";
import { MobileAppSectionLabel } from "@/components/studio-ui/MobileAppSectionLabel";
import { cn } from "@/lib/utils";

type MobileQuickActionsSectionProps = {
  children: ReactNode;
  className?: string;
};

/** Shared Quick Actions section — same label spacing as /app on all home shells. */
export function MobileQuickActionsSection({ children, className }: MobileQuickActionsSectionProps) {
  return (
    <section className={cn(appHomeTokens.section, className)}>
      <div className={appHomeTokens.sectionHeader}>
        <MobileAppSectionLabel>Quick Actions</MobileAppSectionLabel>
      </div>
      {children}
    </section>
  );
}
