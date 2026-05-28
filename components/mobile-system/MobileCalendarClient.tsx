"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileEmptyState } from "./MobileEmptyState";
import { mobileTokens } from "./mobileTokens";

export function MobileCalendarClient() {
  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={mobileTokens.mobileEyebrowLabel}>Coordination</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Calendar</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Walks, milestones, and scheduled field work across your projects.
        </p>
      </section>

      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <MobileEmptyState
          icon={CalendarDays}
          title="No upcoming events"
          description="Scheduled walks and project milestones will appear here."
        />
      </section>
    </div>
  );
}
