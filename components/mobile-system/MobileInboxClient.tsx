"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Inbox, MessageSquare, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationsState } from "@/lib/hooks/useNotificationsState";
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
  const supabase = createClient();
  const { unreadNotifications, notificationsLoading, loadUnreadNotifications } =
    useNotificationsState(supabase);

  useEffect(() => {
    void loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  // Fire-and-forget when a row is opened so it stops showing as unread.
  const markRead = (id: string) => {
    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await loadUnreadNotifications();
  };

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
          <Inbox className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={cn("mt-4", mobileTokens.mobileEyebrowLabel)}>Coordination</p>
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
                    isActive && "border-white text-white",
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
              {notificationsLoading ? (
                <p className="text-sm text-zinc-400">Loading notifications…</p>
              ) : unreadNotifications.length > 0 ? (
                <>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-semibold text-[var(--graphite-primary)] hover:opacity-80"
                    >
                      Mark all read
                    </button>
                  </div>
                  {unreadNotifications.map((notification) => {
                  const href =
                    notification.link_path?.replace(/^\/project-hub(?=\/|$)/, "/projects") ??
                    (notification.project_id ? `/projects/${notification.project_id}` : "/coordination/inbox");
                  return (
                    <Link
                      key={notification.id}
                      href={href}
                      onClick={() => markRead(notification.id)}
                      className={cn(
                        mobileTokens.mobileGlassCardSurface,
                        "block px-4 py-4 transition-colors hover:bg-white/[0.03]",
                      )}
                    >
                      <p className="text-sm font-semibold text-zinc-100">{notification.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[11px] text-zinc-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </Link>
                  );
                })}
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
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
                </>
              )}
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
      <Icon className="h-5 w-5 shrink-0 text-zinc-300" strokeWidth={1.75} />
      <div>
        <p className="text-sm font-semibold text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}
