"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Inbox, MessageSquare, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

const COORDINATION_SECTIONS = [
  {
    label: "Inbox",
    detail: "Notifications, messages, and team alerts.",
    href: "/coordination/inbox",
    icon: Inbox,
  },
  {
    label: "Contacts",
    detail: "Project contacts, vendors, and field partners.",
    href: "/coordination/contacts",
    icon: Users2,
  },
  {
    label: "Calendar",
    detail: "Walks, milestones, and scheduled field work.",
    href: "/coordination/calendar",
    icon: CalendarDays,
  },
] as const;

export function MobileCoordinationHubClient() {
  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
          <MessageSquare className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={mobileTokens.mobileEyebrowLabel}>Coordination</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Communication</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Inbox, contacts, and calendar for field-to-office coordination.
        </p>
      </section>

      <section className={cn(mobileTokens.panelBase, "overflow-hidden")}>
        {COORDINATION_SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={mobileTokens.mobileGlassRowLink}>
              <span className={cn(mobileTokens.mobileIconWell, "h-9 w-9")}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-400">{item.detail}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
            </Link>
          );
        })}
      </section>
    </div>
  );
}
