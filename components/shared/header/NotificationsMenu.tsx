"use client";

/**
 * NotificationsMenu — Bell + dropdown for the dashboard header.
 * Extracted from DashboardHeader for size compliance.
 */

import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";

export type HeaderNotification = {
  id: string;
  project_id: string;
  title: string;
  message: string;
  link_path?: string | null;
  created_at: string;
};

interface NotificationsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: HeaderNotification[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function NotificationsMenu({
  open,
  onOpenChange,
  notifications,
  loading = false,
  onRefresh,
}: NotificationsMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={() => {
          onOpenChange(!open);
          if (!open) onRefresh?.();
        }}
        aria-label="Notifications"
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-white/[0.04] transition-colors"
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-primary" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-app bg-app-card shadow-xl">
            <div className="flex items-center justify-between border-b border-app px-4 py-3">
              <p className="text-sm font-bold text-foreground">Notifications</p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="text-xs font-semibold text-primary hover:opacity-80"
                >
                  Refresh
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 text-sm text-zinc-500">
                  <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-500">No unread alerts.</div>
              ) : (
                notifications.map((n) => {
                  const href = (n.link_path ?? `/projects/${n.project_id}`).replace(
                    /^\/project-hub(?=\/|$)/,
                    "/projects",
                  );
                  return (
                    <Link
                      key={n.id}
                      href={href}
                      onClick={() => onOpenChange(false)}
                      className="block border-b border-app/50 px-4 py-3 hover:bg-white/[0.04]"
                    >
                      <p className="text-sm font-semibold text-zinc-200">{n.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{n.message}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
