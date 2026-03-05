import { useCallback, useMemo, useState, type DragEvent } from "react";
import {
  WIDGET_META,
  type WidgetPref,
  type WidgetSize,
  buildDefaultPrefs,
  DASHBOARD_STORAGE_KEY,
} from "@/lib/widgets/widget-meta";
import {
  saveWidgetPrefs,
  WIDGET_PREFS_SCHEMA_VERSION,
} from "@/lib/widgets/widget-prefs-storage";

type SupabaseAuthClient = {
  auth: {
    updateUser: (payload: {
      data: {
        dashboardWidgets: WidgetPref[];
        dashboardWidgetsVersion: number;
      };
    }) => Promise<unknown>;
  };
};

const DEFAULT_WIDGET_PREFS: WidgetPref[] = buildDefaultPrefs({ expandedIds: ["calendar", "seats"] });

type UseDashboardWidgetPrefsArgs = {
  supabase: SupabaseAuthClient;
  canManageSeats: boolean;
};

export function useDashboardWidgetPrefs({
  supabase,
  canManageSeats,
}: UseDashboardWidgetPrefsArgs) {
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [dashDragIdx, setDashDragIdx] = useState<number | null>(null);

  const toggleVisible = useCallback((id: string) => {
    setWidgetPrefs((prev) => {
      const next = prev.map((pref) => (pref.id === id ? { ...pref, visible: !pref.visible } : pref));
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);

  const setWidgetSize = useCallback((id: string, newSize: WidgetSize) => {
    setWidgetPrefs((prev) => {
      const next = prev.map((pref) => (pref.id === id ? { ...pref, size: newSize } : pref));
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);

  const moveWidget = useCallback((id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const ordered = [...prev].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((pref) => pref.id === id);
      const target = idx + dir;
      if (target < 0 || target >= ordered.length) return prev;
      const next = ordered.map((pref, index) => {
        if (index === idx) return { ...pref, order: ordered[target].order };
        if (index === target) return { ...pref, order: ordered[idx].order };
        return pref;
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);

  const savePrefs = useCallback(async () => {
    setPrefsSaving(true);
    try {
      await supabase.auth.updateUser({
        data: {
          dashboardWidgets: widgetPrefs,
          dashboardWidgetsVersion: WIDGET_PREFS_SCHEMA_VERSION,
        },
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, widgetPrefs);
      setPrefsDirty(false);
    } finally {
      setPrefsSaving(false);
    }
  }, [supabase, widgetPrefs]);

  const resetPrefs = useCallback(() => {
    setWidgetPrefs(DEFAULT_WIDGET_PREFS);
    saveWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS);
    setPrefsDirty(true);
  }, []);

  const handleDashDragStart = useCallback((idx: number) => setDashDragIdx(idx), []);

  const handleDashDragOver = useCallback((event: DragEvent, idx: number) => {
    event.preventDefault();
    if (dashDragIdx === null || dashDragIdx === idx) return;
    setWidgetPrefs((prev) => {
      const visible = [...prev].filter((pref) => pref.visible).sort((a, b) => a.order - b.order);
      const visibleIds = visible.map((pref) => pref.id);
      const [moved] = visibleIds.splice(dashDragIdx, 1);
      visibleIds.splice(idx, 0, moved);
      const next = prev.map((pref) => {
        const visibleIdx = visibleIds.indexOf(pref.id);
        return visibleIdx >= 0 ? { ...pref, order: visibleIdx } : pref;
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setDashDragIdx(idx);
    setPrefsDirty(true);
  }, [dashDragIdx]);

  const handleDashDragEnd = useCallback(() => setDashDragIdx(null), []);

  const drawerMeta = useMemo(
    () =>
      WIDGET_META.filter((meta) => {
        if (meta.id === "seats" && !canManageSeats) return false;
        if (meta.id === "upgrade" && canManageSeats) return false;
        return true;
      }),
    [canManageSeats]
  );

  return {
    widgetPrefs,
    setWidgetPrefs,
    prefsDirty,
    setPrefsDirty,
    prefsSaving,
    dashDragIdx,
    toggleVisible,
    setWidgetSize,
    moveWidget,
    savePrefs,
    resetPrefs,
    handleDashDragStart,
    handleDashDragOver,
    handleDashDragEnd,
    drawerMeta,
  };
}
