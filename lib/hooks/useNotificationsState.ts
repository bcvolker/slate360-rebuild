"use client";

import { useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardInboxNotification as InboxNotification } from "@/lib/types/dashboard";

export function useNotificationsState(supabase: SupabaseClient) {
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<InboxNotification[]>([]);

  const loadUnreadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setUnreadNotifications([]); return; }

      const { data } = await supabase
        .from("project_notifications")
        .select("id, project_id, title, message, link_path, created_at")
        .eq("user_id", authUser.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setUnreadNotifications((data ?? []) as InboxNotification[]);
    } catch {
      setUnreadNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [supabase]);

  return {
    notificationsLoading,
    unreadNotifications,
    loadUnreadNotifications,
  };
}
