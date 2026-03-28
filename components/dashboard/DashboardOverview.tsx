"use client";

import { type RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderOpen,
} from "lucide-react";
import DashboardProjectCard from "@/components/dashboard/DashboardProjectCard";
import DashboardWidgetRenderer, {
  type WidgetRendererContext,
} from "@/components/dashboard/DashboardWidgetRenderer";
import DashboardWidgetPopout from "@/components/dashboard/DashboardWidgetPopout";
import {
  type WidgetPref,
  getWidgetSpan,
} from "@/lib/widgets/widget-meta";
import type {
  DashboardProject as Project,
} from "@/lib/types/dashboard";
import type { DashTab } from "@/lib/types/dashboard";

/* ================================================================
   TYPES
   ================================================================ */

interface DashboardOverviewProps {
  userName: string;

  /* Module tiles */
  visibleTabs: DashTab[];
  showDashboardTiles: boolean;
  onOpenSlateDrop: () => void;
  onSetActiveTab: (tabId: string) => void;

  /* Project carousel */
  projects: Project[];
  selectedProject: string;
  onSelectProject: (id: string) => void;
  projectDropdownOpen: boolean;
  onProjectDropdownToggle: () => void;
  projectTypeEmoji: (t: Project["type"]) => string;
  onCreateProject: () => void;
  carouselRef: RefObject<HTMLDivElement | null>;
  onScrollCarousel: (dir: number) => void;
  onProjectDeleted: (id: string) => void;

  /* Widget grid */
  widgetPrefs: WidgetPref[];
  widgetPopoutId: string | null;
  onCloseWidgetPopout: () => void;
  dashDragIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  availableWidgets: Set<string>;
  widgetCtx: WidgetRendererContext;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function DashboardOverview({
  userName,
  visibleTabs,
  showDashboardTiles,
  onOpenSlateDrop,
  onSetActiveTab,
  projects,
  selectedProject,
  onSelectProject,
  projectDropdownOpen,
  onProjectDropdownToggle,
  projectTypeEmoji,
  onCreateProject,
  carouselRef,
  onScrollCarousel,
  onProjectDeleted,
  widgetPrefs,
  widgetPopoutId,
  onCloseWidgetPopout,
  dashDragIdx,
  onDragStart,
  onDragOver,
  onDragEnd,
  availableWidgets,
  widgetCtx,
}: DashboardOverviewProps) {
  const router = useRouter();

  const orderedVisible = [...widgetPrefs]
    .filter((p) => p.visible && availableWidgets.has(p.id))
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {/* ════════ WELCOME BANNER + WORKSPACE QUICK-ACCESS ════════ */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Welcome back, {userName} 👋</h2>
            <p className="text-sm text-gray-500 mt-1">Pick a module below or jump into a project to get started.</p>
          </div>
        </div>
        {showDashboardTiles && (() => {
          const allTiles = visibleTabs;
          const count = allTiles.length;
          const iconSize = count <= 4 ? 26 : count <= 6 ? 22 : count <= 10 ? 18 : 16;
          const iconBox = count <= 4 ? "w-14 h-14" : count <= 6 ? "w-12 h-12" : count <= 10 ? "w-10 h-10" : "w-9 h-9";
          const iconRadius = count <= 6 ? "rounded-2xl" : "rounded-xl";
          const labelSize = count <= 4 ? "text-sm" : count <= 6 ? "text-xs" : "text-[11px]";
          const pad = count <= 4 ? "p-5" : count <= 6 ? "p-4" : count <= 10 ? "p-3" : "p-2.5";
          return (
            <div className="hidden md:flex gap-3 pb-1">
              {allTiles.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === "slatedrop") { onOpenSlateDrop(); return; }
                      const routeMap: Record<string, string> = {
                        "project-hub": "/project-hub",
                        "design-studio": "/design-studio",
                        "content-studio": "/content-studio",
                        "tours": "/tours",
                        "geospatial": "/geospatial",
                        "virtual-studio": "/virtual-studio",
                        "analytics": "/analytics",
                        "my-account": "/my-account",
                        "ceo": "/ceo",
                        "market": "/market",
                        "athlete360": "/athlete360",
                      };
                      const route = routeMap[tab.id];
                      if (route) { router.push(route); return; }
                      onSetActiveTab(tab.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`group md:flex-1 md:min-w-0 flex flex-col items-center gap-1.5 sm:gap-2 ${pad} rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center`}
                  >
                    <div
                      className={`${iconBox} ${iconRadius} flex items-center justify-center transition-all group-hover:scale-110`}
                      style={{ backgroundColor: `${tab.color}15` }}
                    >
                      <TabIcon size={iconSize} style={{ color: tab.color }} />
                    </div>
                    <span className={`${labelSize} font-semibold text-gray-700 group-hover:text-gray-900 leading-tight truncate max-w-full`}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Mobile quick-access removed — header QuickNav handles navigation */}

      {/* ════════ PROJECT CAROUSEL ════════ */}
      <div className="relative mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Your Projects</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={onProjectDropdownToggle}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-gray-300 transition-colors"
              >
                <FolderOpen size={13} className="text-gray-400" />
                {selectedProject === "all" ? "All projects" : projects.find((p) => p.id === selectedProject)?.name ?? "All projects"}
                <ChevronDown size={12} className="text-gray-400" />
              </button>
              {projectDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={onProjectDropdownToggle} />
                  <div className="absolute right-0 top-10 w-56 bg-white rounded-xl border border-gray-100 shadow-xl z-40 overflow-hidden">
                    <button onClick={() => { onSelectProject("all"); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedProject === "all" ? "bg-[#FF4D00]/5 text-[#FF4D00] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>All projects</button>
                    {projects.map((p) => (
                      <button key={p.id} onClick={() => { onSelectProject(p.id); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedProject === p.id ? "bg-[#FF4D00]/5 text-[#FF4D00] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>{p.name}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={onCreateProject}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#FF4D00" }}
            >
              <Plus size={13} /> New Project
            </button>
            <button onClick={() => onScrollCarousel(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => onScrollCarousel(1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {projects.map((p) => (
            <DashboardProjectCard
              key={p.id}
              project={p}
              projectTypeEmoji={projectTypeEmoji}
              onDeleted={() => onProjectDeleted(p.id)}
            />
          ))}

          {projects.length === 0 && (
            <div className="snap-start shrink-0 w-full rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              No projects yet. Create a project in Project Hub to populate this dashboard.
            </div>
          )}

          {/* + New Project card */}
          <button
            type="button"
            onClick={onCreateProject}
            className="snap-start shrink-0 w-[300px] h-[200px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#FF4D00] flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-[#FF4D00] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white/50"
          >
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={24} />
            </div>
            <span className="text-sm font-semibold">New Project</span>
          </button>
        </div>
      </div>

      {/* ════════ WIDGET GRID ════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {orderedVisible.map((p, idx) => (
          <div
            key={p.id}
            draggable={(p.size === "default" || p.size === "sm") && p.id !== "location"}
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
            className={`${(p.size !== "default" && p.size !== "sm") ? "" : "cursor-grab active:cursor-grabbing"} ${dashDragIdx === idx ? "opacity-50 scale-95" : ""} ${getWidgetSpan(p.id, p.size)} transition-all duration-200`}
          >
            <DashboardWidgetRenderer id={p.id} widgetSize={p.size} ctx={widgetCtx} />
          </div>
        ))}
      </div>

      <DashboardWidgetPopout
        widgetId={widgetPopoutId}
        onClose={onCloseWidgetPopout}
        availableWidgets={availableWidgets}
        ctx={widgetCtx}
      />
    </>
  );
}
