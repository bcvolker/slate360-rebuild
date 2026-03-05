import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  WIDGET_META,
  type WidgetMeta,
  type WidgetPref,
  type WidgetSize,
  buildDefaultPrefs,
  HUB_STORAGE_KEY,
} from "@/lib/widgets/widget-meta";
import { loadWidgetPrefs, saveWidgetPrefs } from "@/lib/widgets/widget-prefs-storage";

const HUB_WIDGET_IDS = [
  "slatedrop",
  "location",
  "data-usage",
  "processing",
  "suggest",
  "weather",
  "financial",
  "calendar",
  "contacts",
  "continue",
];

const DEFAULT_VISIBLE = [
  "slatedrop",
  "location",
  "data-usage",
  "processing",
  "suggest",
  "weather",
];

const HUB_WIDGET_META: WidgetMeta[] = WIDGET_META.filter((widget) => HUB_WIDGET_IDS.includes(widget.id));

const DEFAULT_HUB_PREFS: WidgetPref[] = buildDefaultPrefs({
  visibleOnly: DEFAULT_VISIBLE,
  expandedIds: [],
})
  .filter((pref) => HUB_WIDGET_IDS.includes(pref.id))
  .map((pref, index) => ({ ...pref, order: index }));

type SlateDropFolder = { name: string; count: number };
type SlateDropFile = { name: string };
type WidgetWithSize = WidgetMeta & { size: WidgetSize };

export function useProjectHubWidgets() {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [slateDropFolders, setSlateDropFolders] = useState<SlateDropFolder[]>([]);
  const [slateDropFiles, setSlateDropFiles] = useState<SlateDropFile[]>([]);
  const [slateDropWidgetView, setSlateDropWidgetView] = useState<"recent" | "folders">("folders");
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(() =>
    loadWidgetPrefs(HUB_STORAGE_KEY, DEFAULT_HUB_PREFS)
  );

  useEffect(() => {
    saveWidgetPrefs(HUB_STORAGE_KEY, widgetPrefs);
  }, [widgetPrefs]);

  const orderedVisible = useMemo(
    () => [...widgetPrefs].filter((pref) => pref.visible).sort((a, b) => a.order - b.order),
    [widgetPrefs]
  );

  const visibleWidgets = useMemo(
    () =>
      orderedVisible
        .map((pref) => {
          const widget = HUB_WIDGET_META.find((meta) => meta.id === pref.id);
          return widget ? { ...widget, size: pref.size } : null;
        })
        .filter(Boolean) as WidgetWithSize[],
    [orderedVisible]
  );

  useEffect(() => {
    fetch("/api/slatedrop/folders", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.folders)) {
          setSlateDropFolders(
            (data.folders as { name: string; file_count?: number }[])
              .slice(0, 5)
              .map((folder) => ({ name: folder.name, count: folder.file_count ?? 0 }))
          );
        }
      })
      .catch(() => {});

    fetch("/api/slatedrop/files?folderId=general", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data?.files)) {
          setSlateDropFiles((data.files as SlateDropFile[]).slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (event: DragEvent, idx: number) => {
    event.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const visibleIds = orderedVisible.map((pref) => pref.id);
    const [moved] = visibleIds.splice(dragIdx, 1);
    visibleIds.splice(idx, 0, moved);
    setWidgetPrefs((prev) =>
      prev.map((pref) => {
        const visibleIndex = visibleIds.indexOf(pref.id);
        return visibleIndex >= 0 ? { ...pref, order: visibleIndex } : pref;
      })
    );
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  const toggleWidgetVisible = (id: string) => {
    setWidgetPrefs((prev) => prev.map((pref) => (pref.id === id ? { ...pref, visible: !pref.visible } : pref)));
  };

  const setWidgetSize = (id: string, newSize: WidgetSize) => {
    if (id === "slatedrop") {
      setSlateDropWidgetView("folders");
    }
    setWidgetPrefs((prev) => prev.map((pref) => (pref.id === id ? { ...pref, size: newSize } : pref)));
  };

  const moveWidgetOrder = (id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((pref) => pref.id === id);
      const target = idx + dir;
      if (target < 0 || target >= sorted.length) return prev;
      return sorted.map((pref, index) => {
        if (index === idx) return { ...pref, order: sorted[target].order };
        if (index === target) return { ...pref, order: sorted[idx].order };
        return pref;
      });
    });
  };

  return {
    dragIdx,
    hubWidgetMeta: HUB_WIDGET_META,
    visibleWidgets,
    widgetPrefs,
    slateDropFolders,
    slateDropFiles,
    slateDropWidgetView,
    setSlateDropWidgetView,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    toggleWidgetVisible,
    setWidgetSize,
    moveWidgetOrder,
    resetWidgetPrefs: () => setWidgetPrefs(DEFAULT_HUB_PREFS),
  };
}
