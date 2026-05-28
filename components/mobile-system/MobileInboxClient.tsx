"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Inbox, MessageSquare, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

const INBOX_TABS = [
  { key: "notifications", label: "Notifications" },
  { key: "messages", label: "Messages" },
  { key: "milestones", label: "Upcoming" },
] as const;

type InboxTabKey = (typeof INBOX_TABS)[number]["key"];

const COORDINATION_LINKS = [
  { label: "Contacts", href: "/coordination/contacts", icon: Users2 },
  { label: "Calendar", href: "/coordination/calendar", icon: CalendarDays },
] as const;

export function MobileInboxClient() {
  const pathname = usePathname() ?? "/coordination/inbox";
  const searchParams = useSearchParams();
  const active = (searchParams?.get("tab") ?? "notifications") as InboxTabKey;

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={mobileTokens.mobileEyebrowLabel}>Coordination</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Inbox</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Messages, notifications, and team coordination in one place.
        </p>
      </section>

      <nav className="grid grid-cols-2 gap-2" aria-label="Coordination shortcuts">
        {COORDINATION_LINKS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(mobileTokens.mobileGlassCardSurface, "flex items-center gap-3 px-3 py-3")}
          >
            <span className={cn(mobileTokens.mobileIconWell, "h-9 w-9")}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-semibold text-zinc-100">{label}</span>
          </Link>
        ))}
      </nav>

      <section className={cn(mobileTokens.panelBase, "overflow-hidden")}>
        <div className={mobileTokens.panelTabStripWrapper} role="tablist" aria-label="Inbox filter">
          <div className="flex">
            {INBOX_TABS.map((tab) => {
              const isActive = active === tab.key;
              const params = new URLSearchParams(searchParams?.toString() ?? "");
              if (tab.key === "notifications") {
                params.delete("tab");
              } else {
                params.set("tab", tab.key);
              }
              const query = params.toString();
              const href = query ? `${pathname}?${query}` : pathname;
              return (
                <Link
                  key={tab.key}
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    mobileTokens.panelTabTrigger,
                    "flex-1 text-center",
                    isActive && "border-teal-400 text-white",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={mobileTokens.panelContent}>
          {active === "notifications" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-teal-400/20 bg-teal-400/10 p-4">
                <p className="text-sm font-medium leading-relaxed text-zinc-200">
                  Welcome. Assigned walks and project notifications appear here when your team
                  shares work with you.
                </p>
              </div>
              <EmptyInboxRow
                icon={Inbox}
                title="No notifications"
                detail="You are caught up for now."
              />
            </div>
          )}

          {active === "messages" && (
            <EmptyInboxRow
              icon={MessageSquare}
              title="No direct messages"
              detail="Team messages will appear here."
            />
          )}

          {active === "milestones" && (
            <EmptyInboxRow
              icon={CalendarDays}
              title="No upcoming milestones"
              detail="Schedule items from your projects will show here."
            />
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyInboxRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Inbox;
  title: string;
  detail: string;
}) {
  return (
    <div
      className={cn(
        mobileTokens.mobileGlassCardSurface,
        "flex items-center gap-3 border-dashed px-4 py-4 opacity-80",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-teal-400/80" strokeWidth={1.75} />
      <div>
        <p className="text-sm font-semibold text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}
