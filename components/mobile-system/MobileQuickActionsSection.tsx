"use client";

import type { ReactNode } from "react";
import { mobileTokens } from "./mobileTokens";

type MobileQuickActionsSectionProps = {
  children: ReactNode;
};

/** Shared "Quick Actions" section header + grid slot — lives in MobileShell dock on all home shells. */
export function MobileQuickActionsSection({ children }: MobileQuickActionsSectionProps) {
  return (
    <section className={mobileTokens.mobileHomeSection}>
      <div className={mobileTokens.mobileHomeSectionHeader}>
        <span className={mobileTokens.appHomeSectionLabelAccent} aria-hidden />
        <p className={mobileTokens.appHomeSectionLabel}>Quick Actions</p>
      </div>
      {children}
    </section>
  );
}
