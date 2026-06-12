"use client";

import {
  MobileQuickActionsSection,
  MobileQuickActionStrip,
  type MobileQuickActionItem,
} from "@/components/mobile-system";

type MobileAppHomeQuickActionsProps = {
  actions: MobileQuickActionItem[];
  className?: string;
};

/** Quick Actions block — identical grid/card anatomy on /app and module hubs. */
export function MobileAppHomeQuickActions({ actions, className }: MobileAppHomeQuickActionsProps) {
  return (
    <MobileQuickActionsSection className={className}>
      <MobileQuickActionStrip actions={actions} />
    </MobileQuickActionsSection>
  );
}
