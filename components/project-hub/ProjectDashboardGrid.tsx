"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  FolderOpen,
  Info,
  MapPin,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import { loadWidgetPrefs, saveWidgetPrefs, WIDGET_PREFS_SCHEMA_VERSION } from "@/components/widgets/widget-prefs-storage";
import {
  ContinueWidgetBody,
  WeatherWidgetBody,
} from "@/components/widgets/WidgetBodies";
import type { WidgetMeta, WidgetPref } from "@/components/widgets/widget-meta";
import LocationMap from "@/components/dashboard/LocationMap";

type ProjectGridProject = {
  name?: string;
  description?: string | null;
  status?: string;
  created_at?: string;
  metadata?: {
    location?: string;
  };
};

type RecentFile = {
  id: string;
  name: string;
};

const PROJECT_WIDGET_META: WidgetMeta[] = [
  { id: "project-info", label: "Project Info", icon: Info, color: "#1E3A8A" },
  { id: "location", label: "Site Location", icon: MapPin, color: "#1E3A8A" },
  { id: "weather", label: "Weather", icon: Sun, color: "#0891B2" },
  { id: "slatedrop", label: "SlateDrop", icon: FolderOpen, color: "#FF4D00" },
  { id: "continue", label: "Continue Working", icon: Clock, color: "#FF4D00" },
];

function buildProjectDefaultPrefs(): WidgetPref[] {
  return PROJECT_WIDGET_META.map((widget, index) => ({
    id: widget.id,
    visible: true,
    expanded: false,
    order: index,
  }));
}

function getProjectWidgetSpan(id: string, expanded: boolean): string {
  if (id === "location" || id === "slatedrop") return expanded ? "md:col-span-2" : "";
  return expanded ? "md:col-span-2" : "";
}

export default function ProjectDashboardGrid({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectGridProject;
}) {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const storageKey = `slate360-project-widgets-v${WIDGET_PREFS_SCHEMA_VERSION}-${projectId}`;

  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(() => loadWidgetPrefs(storageKey, buildProjectDefaultPrefs()));

  useEffect(() => {
    let active = true;
    void fetch(`/api/projects/${projectId}/recent-files`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: { files?: RecentFile[] }) => {
        if (!active) return;
        setFiles(Array.isArray(payload.files) ? payload.files : []);
      })
      .catch(() => {
        if (!active) return;
        setFiles([]);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    saveWidgetPrefs(storageKey, widgetPrefs);
  }, [storageKey, widgetPrefs]);

  const orderedVisible = useMemo(
    () => [...widgetPrefs].filter((pref) => pref.visible).sort((a, b) => a.order - b.order),
    [widgetPrefs],
  );

  const toggleVisible = useCallback((id: string) => {
    setWidgetPrefs((prev) => prev.map((pref) => (pref.id === id ? { ...pref, visible: !pref.visible } : pref)));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setWidgetPrefs((prev) => prev.map((pref) => (pref.id === id ? { ...pref, expanded: !pref.expanded } : pref)));
  }, []);

  const moveOrder = useCallback((id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((pref) => pref.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= sorted.length) return prev;
      return sorted.map((pref, i) => {
        if (i === idx) return { ...pref, order: sorted[target].order };
        if (i === target) return { ...pref, order: sorted[idx].order };
        return pref;
      });
    });
  }, []);

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setWidgetPrefs((prev) => {
      const visible = [...prev].filter((pref) => pref.visible).sort((a, b) => a.order - b.order);
      const ids = visible.map((pref) => pref.id);
      const [moved] = ids.splice(dragIdx, 1);
      ids.splice(idx, 0, moved);
      return prev.map((pref) => {
        const visibleIndex = ids.indexOf(pref.id);
        return visibleIndex >= 0 ? { ...pref, order: visibleIndex } : pref;
      });
    });
    setDragIdx(idx);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => setDragIdx(null), []);

  const renderBody = (id: string, expanded: boolean) => {
    if (id === "project-info") {
      return (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex-1">
          <p className="text-lg font-black text-[#1E3A8A]">{project.name ?? "Project"}</p>
          <p className="text-sm text-gray-500 mt-1">{project.description || "No description provided."}</p>
          <div className="mt-4 flex items-center justify-between text-[11px] text-gray-400">
            <span>Status: {project.status ?? "active"}</span>
            <span>{project.created_at ? new Date(project.created_at).toLocaleDateString() : ""}</span>
          </div>
        </div>
      );
    }

    if (id === "location") {
      return (
        <div className={expanded ? "min-h-[420px] flex flex-col" : "min-h-[200px] flex flex-col"}>
          <LocationMap
            locationLabel={project.metadata?.location}
            compact={!expanded}
            expanded={expanded}
          />
        </div>
      );
    }

    if (id === "weather") {
      return <WeatherWidgetBody tempF={72} condition="Project site weather" expanded={expanded} />;
    }

    if (id === "slatedrop") {
      return (
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">Recent project files</p>
            <Link
              href={`/project-hub/${projectId}/slatedrop`}
              className="text-[11px] font-bold text-[#FF4D00] hover:underline"
            >
              View All
            </Link>
          </div>
          {files.length === 0 ? (
            <p className="text-xs text-gray-400 rounded-xl border border-gray-100 bg-gray-50 p-3">No files yet.</p>
          ) : (
            <ul className="space-y-2">
              {files.slice(0, expanded ? 8 : 4).map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <FileText size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 truncate">{file.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (id === "continue") {
      return (
        <ContinueWidgetBody
          items={[
            { title: "Open RFIs", subtitle: "Review pending requests", href: `/project-hub/${projectId}/rfis` },
            { title: "Review budget updates", subtitle: "Check new spend entries", href: `/project-hub/${projectId}/budget` },
            { title: "Open drawings", subtitle: "Continue markup", href: `/project-hub/${projectId}/drawings` },
          ]}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Project Widgets</h2>
        <button
          onClick={() => setCustomizeOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <SlidersHorizontal size={14} />
          Customize
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orderedVisible.map((pref, idx) => {
          const meta = PROJECT_WIDGET_META.find((widget) => widget.id === pref.id);
          if (!meta) return null;
          return (
            <WidgetCard
              key={pref.id}
              icon={meta.icon}
              title={meta.label}
              color={meta.color}
              span={getProjectWidgetSpan(pref.id, pref.expanded)}
              onExpand={() => toggleExpanded(pref.id)}
              isExpanded={pref.expanded}
              draggable={!pref.expanded && pref.id !== "location"}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              isDragging={dragIdx === idx}
            >
              {renderBody(pref.id, pref.expanded)}
            </WidgetCard>
          );
        })}
      </div>

      <WidgetCustomizeDrawer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Project Widgets"
        subtitle="Reorder, show/hide, and resize widgets"
        widgetPrefs={widgetPrefs}
        widgetMeta={PROJECT_WIDGET_META}
        onToggleVisible={toggleVisible}
        onToggleExpanded={toggleExpanded}
        onMoveOrder={moveOrder}
        onReset={() => setWidgetPrefs(buildProjectDefaultPrefs())}
      />
    </div>
  );
}