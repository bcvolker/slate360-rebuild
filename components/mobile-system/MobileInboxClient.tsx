"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CalendarDays, Inbox, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationsState } from "@/lib/hooks/useNotificationsState";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

const COORDINATION_LINKS = [
  { label: "Contacts", href: "/coordination/contacts", icon: Users2 },
  { label: "Calendar", href: "/coordination/calendar", icon: CalendarDays },
] as const;

export function MobileInboxClient() {
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
          Comments, uploads, and job updates that need your attention.
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

      <section className={cn(mobileTokens.panelBase, "p-4")}>
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
                  (notification.project_id
                    ? `/projects/${notification.project_id}`
                    : "/coordination/inbox");
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
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
                <Inbox className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-100">You&rsquo;re all caught up</p>
                <p className="max-w-xs text-xs leading-relaxed text-zinc-400">
                  Client comments, uploads, and job updates appear here when your team shares work
                  with you.
                </p>
              </div>
              <Link
                href="/coordination/calendar"
                className="text-xs font-semibold text-[var(--graphite-primary)] hover:opacity-80"
              >
                Open calendar
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
