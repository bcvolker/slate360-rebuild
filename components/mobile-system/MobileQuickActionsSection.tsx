"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileQuickActionsSectionProps = {
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  accentClassName?: string;
};

/** Shared "Quick Actions" section header + grid slot — lives in MobileShell dock on all home shells. */
export function MobileQuickActionsSection({
  children,
  className,
  labelClassName,
  accentClassName,
}: MobileQuickActionsSectionProps) {
  return (
    <section className={cn(mobileTokens.mobileHomeSection, className)}>
      <div className={mobileTokens.mobileHomeSectionHeader}>
        <span
          className={cn(mobileTokens.appHomeSectionLabelAccent, accentClassName)}
          aria-hidden
        />
        <p className={cn(mobileTokens.appHomeSectionLabel, labelClassName)}>Quick Actions</p>
      </div>
      {children}
    </section>
  );
}
