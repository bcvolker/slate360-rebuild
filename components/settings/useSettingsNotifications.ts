"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationFrequency,
  type NotificationPrefs,
} from "./settings-types";

type UseSettingsNotificationsOptions = {
  onStatus: (ok: boolean, text: string) => void;
};

function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_NOTIFICATION_PREFS;
  }
  const source = raw as Partial<NotificationPrefs>;
  return {
    projectUpdates: source.projectUpdates ?? DEFAULT_NOTIFICATION_PREFS.projectUpdates,
    walkAssignments: source.walkAssignments ?? DEFAULT_NOTIFICATION_PREFS.walkAssignments,
    deliverableReady: source.deliverableReady ?? DEFAULT_NOTIFICATION_PREFS.deliverableReady,
    teamActivity: source.teamActivity ?? DEFAULT_NOTIFICATION_PREFS.teamActivity,
    billingAlerts: source.billingAlerts ?? DEFAULT_NOTIFICATION_PREFS.billingAlerts,
    systemMaintenance: source.systemMaintenance ?? DEFAULT_NOTIFICATION_PREFS.systemMaintenance,
  };
}

export function useSettingsNotifications({ onStatus }: UseSettingsNotificationsOptions) {
  const supabase = createClient();
  const [notificationFrequency, setNotificationFrequency] = useState<NotificationFrequency>("daily");
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      const meta = data.user.user_metadata ?? {};
      const freq = meta.notificationFrequency;
      if (freq === "off" || freq === "daily" || freq === "weekly") {
        setNotificationFrequency(freq);
      }
      setPrefs(parseNotificationPrefs(meta.notificationPrefs));
    }
    void loadPrefs();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const persistPrefs = useCallback(
    async (nextFrequency: NotificationFrequency, nextPrefs: NotificationPrefs) => {
      setBusy(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            notificationFrequency: nextFrequency,
            notificationPrefs: nextPrefs,
            importantAlerts:
              nextPrefs.walkAssignments ||
              nextPrefs.deliverableReady ||
              nextPrefs.projectUpdates,
          },
        });
        if (error) throw error;
        onStatus(true, "Notification preferences saved.");
      } catch (err) {
        onStatus(false, err instanceof Error ? err.message : "Could not save preferences.");
      } finally {
        setBusy(false);
      }
    },
    [supabase, onStatus],
  );

  const queueSave = useCallback(
    (nextFrequency: NotificationFrequency, nextPrefs: NotificationPrefs) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void persistPrefs(nextFrequency, nextPrefs);
      }, 450);
    },
    [persistPrefs],
  );

  const updateFrequency = useCallback(
    (value: NotificationFrequency) => {
      setNotificationFrequency(value);
      queueSave(value, prefs);
    },
    [prefs, queueSave],
  );

  const updatePref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      setPrefs((current) => {
        const next = { ...current, [key]: value };
        queueSave(notificationFrequency, next);
        return next;
      });
    },
    [notificationFrequency, queueSave],
  );

  const saveNotificationPreferences = useCallback(async () => {
    await persistPrefs(notificationFrequency, prefs);
  }, [persistPrefs, notificationFrequency, prefs]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  return {
    notificationFrequency,
    updateFrequency,
    prefs,
    updatePref,
    busy,
    saveNotificationPreferences,
  };
}
