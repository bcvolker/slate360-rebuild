"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GripVertical, Eye, EyeOff, RotateCcw, X } from "lucide-react";
import type { MarketTabPref, MarketLayoutMode } from "@/lib/market/layout-presets";

interface Props {
  tabs: MarketTabPref[];
  mode: MarketLayoutMode;
  open: boolean;
  onClose: () => void;
  onReorder: (fromId: string, toId: string) => void;
  onToggleVisibility: (id: string) => void;
  onModeChange: (mode: MarketLayoutMode) => void;
  onReset: () => void;
}

const MODE_LABELS: Record<MarketLayoutMode, string> = {
  simple: "Simple",
  standard: "Standard",
  advanced: "Advanced",
  custom: "Custom",
};

export default function MarketCustomizeDrawer({
  tabs,
  mode,
  open,
  onClose,
  onReorder,
  onToggleVisibility,
  onModeChange,
  onReset,
}: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (dragging && dragging !== targetId) onReorder(dragging, targetId);
      setDragging(null);
      setDragOver(null);
    },
    [dragging, onReorder],
  );

  if (!open) return null;

  return (
    <div
      ref={drawerRef}
      className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">Customize Layout</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            title="Reset to default"
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 block mb-1.5">Layout Mode</label>
        <div className="flex gap-1">
          {(Object.keys(MODE_LABELS) as MarketLayoutMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                mode === m
                  ? "bg-[#FF4D00] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab order + visibility */}
      <p className="text-xs text-gray-400 mb-2">Drag to reorder · click eye to show/hide</p>
      <ul className="space-y-1">
        {tabs.map((tab) => (
          <li
            key={tab.id}
            draggable
            onDragStart={() => setDragging(tab.id)}
            onDragEnd={() => { setDragging(null); setDragOver(null); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(tab.id); }}
            onDrop={() => handleDrop(tab.id)}
            className={`
              flex items-center gap-2 p-2 rounded-lg text-sm cursor-grab
              ${dragOver === tab.id && dragging !== tab.id ? "bg-orange-50 ring-1 ring-orange-300" : "hover:bg-gray-50"}
              ${!tab.visible ? "opacity-50" : ""}
            `}
          >
            <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <span className="flex-1 truncate text-gray-800">{tab.label}</span>
            <button
              onClick={() => onToggleVisibility(tab.id)}
              title={tab.visible ? "Hide tab" : "Show tab"}
              className="text-gray-400 hover:text-gray-700 shrink-0"
            >
              {tab.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
