"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Settings2, GripVertical, Eye, EyeOff, RotateCcw } from "lucide-react";

export interface MarketTab {
  id: string;
  label: string;
  visible: boolean;
}

interface Props {
  tabs: MarketTab[];
  activeTab: string;
  onTabChange: (label: string) => void;
  onTabsChange: (tabs: MarketTab[]) => void;
}

const DEFAULT_TABS: MarketTab[] = [
  { id: "Dashboard", label: "Dashboard", visible: true },
  { id: "Wallet & Performance", label: "Wallet & Performance", visible: true },
  { id: "Markets", label: "Markets", visible: true },
  { id: "Hot Opps", label: "Hot Opps", visible: true },
  { id: "Directives", label: "Directives", visible: true },
  { id: "Whale Watch", label: "Whale Watch", visible: true },
  { id: "Sim Compare", label: "Sim Compare", visible: true },
];

export const DEFAULT_MARKET_TABS = DEFAULT_TABS;

const LS_KEY = "market_tab_prefs_v1";

export function loadTabPrefs(): MarketTab[] {
  if (typeof window === "undefined") return DEFAULT_TABS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_TABS;
    const parsed = JSON.parse(raw) as MarketTab[];
    // Merge: add any new default tabs not yet in saved prefs
    const savedIds = new Set(parsed.map(t => t.id));
    const merged = [...parsed];
    for (const def of DEFAULT_TABS) {
      if (!savedIds.has(def.id)) merged.push(def);
    }
    return merged;
  } catch {
    return DEFAULT_TABS;
  }
}

export function saveTabPrefs(tabs: MarketTab[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(tabs));
  // Best-effort DB persist
  fetch("/api/market/tab-prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tabs }),
  }).catch(() => { /* non-critical */ });
}

export default function MarketTabBar({ tabs, activeTab, onTabChange, onTabsChange }: Props) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ── Tab drag-to-reorder ───────────────────────────────────────────────────
  const handleDragStart = useCallback((id: string) => setDragging(id), []);
  const handleDragEnd = useCallback(() => { setDragging(null); setDragOver(null); }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const next = [...tabs];
    const fromIdx = next.findIndex(t => t.id === dragging);
    const toIdx = next.findIndex(t => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onTabsChange(next);
    saveTabPrefs(next);
    setDragging(null);
    setDragOver(null);
  }, [dragging, tabs, onTabsChange]);

  // ── Drawer: toggle visibility ─────────────────────────────────────────────
  const toggleVisible = useCallback((id: string) => {
    const next = tabs.map(t => t.id === id ? { ...t, visible: !t.visible } : t);
    // Always keep at least one visible
    if (next.filter(t => t.visible).length === 0) return;
    onTabsChange(next);
    saveTabPrefs(next);
  }, [tabs, onTabsChange]);

  const drawerReorder = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const next = [...tabs];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onTabsChange(next);
    saveTabPrefs(next);
  }, [tabs, onTabsChange]);

  const resetToDefault = useCallback(() => {
    onTabsChange(DEFAULT_TABS);
    saveTabPrefs(DEFAULT_TABS);
  }, [onTabsChange]);

  const visible = tabs.filter(t => t.visible);

  return (
    <div className="relative flex items-end gap-1 border-b border-gray-200 overflow-x-auto pb-px mb-6">
      {/* ── Draggable tab buttons ── */}
      {visible.map(tab => (
        <button
          key={tab.id}
          draggable
          onDragStart={() => handleDragStart(tab.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => { e.preventDefault(); setDragOver(tab.id); }}
          onDrop={() => handleDrop(tab.id)}
          onClick={() => onTabChange(tab.label)}
          className={`
            group relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all
            border-b-2 -mb-px rounded-t-lg select-none
            ${activeTab === tab.label
              ? "border-[#FF4D00] text-[#FF4D00] bg-orange-50/50"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }
            ${dragOver === tab.id && dragging !== tab.id ? "ring-2 ring-orange-300 ring-offset-0" : ""}
            cursor-grab active:cursor-grabbing
          `}
        >
          <span className="flex items-center gap-1.5">
            <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
            {tab.label}
          </span>
        </button>
      ))}

      {/* ── Customize button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Customize tabs"
        className="ml-auto mb-1 flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors shrink-0"
      >
        <Settings2 className="w-4 h-4" />
        <span className="hidden sm:inline">Tabs</span>
      </button>

      {/* ── Customizer drawer ── */}
      {open && (
        <div
          ref={drawerRef}
          className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-64"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">Customize Tabs</span>
            <button
              onClick={resetToDefault}
              title="Reset to default"
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">Drag to reorder · click eye to show/hide</p>
          <ul className="space-y-1">
            {tabs.map((tab, idx) => (
              <li
                key={tab.id}
                draggable
                onDragStart={() => handleDragStart(tab.id)}
                onDragEnd={handleDragEnd}
                onDragOver={e => { e.preventDefault(); setDragOver(tab.id); }}
                onDrop={() => drawerReorder(tabs.findIndex(t => t.id === dragging), idx)}
                className={`
                  flex items-center gap-2 p-2 rounded-lg text-sm cursor-grab
                  ${dragOver === tab.id && dragging !== tab.id ? "bg-orange-50 ring-1 ring-orange-300" : "hover:bg-gray-50"}
                  ${!tab.visible ? "opacity-50" : ""}
                `}
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="flex-1 truncate text-gray-800">{tab.label}</span>
                <button
                  onClick={() => toggleVisible(tab.id)}
                  title={tab.visible ? "Hide tab" : "Show tab"}
                  className="text-gray-400 hover:text-gray-700 shrink-0"
                >
                  {tab.visible
                    ? <Eye className="w-4 h-4" />
                    : <EyeOff className="w-4 h-4" />
                  }
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
