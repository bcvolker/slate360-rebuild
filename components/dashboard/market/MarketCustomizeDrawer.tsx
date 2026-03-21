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
      className="absolute right-0 top-full mt-1 z-50 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 w-80 text-slate-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-white">Customize Layout</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            title="Reset to default"
            className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 block mb-2">Layout Mode</label>
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
          {(Object.keys(MODE_LABELS) as MarketLayoutMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`flex-1 px-4 py-2 text-xs rounded-[10px] font-medium transition-all ${
                mode === m
                  ? "bg-[#FF4D00] text-white shadow-inner"
                  : "text-slate-400 hover:bg-zinc-800"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-3">Drag to reorder • click eye to toggle visibility</p>
      
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
              group flex items-center gap-3 px-4 py-3 rounded-xl text-sm cursor-grab active:cursor-grabbing border
              ${dragOver === tab.id && dragging !== tab.id 
                ? "bg-orange-500/10 border-orange-500/30" 
                : "border-transparent hover:bg-zinc-900"
              }
              ${!tab.visible ? "opacity-60" : ""}
            `}
          >
            <GripVertical className="w-4 h-4 text-slate-600 group-active:text-slate-400" />
            <span className="flex-1 text-slate-200">{tab.label}</span>
            
            <button
              onClick={() => onToggleVisibility(tab.id)}
              title={tab.visible ? "Hide tab" : "Show tab"}
              className="text-slate-500 hover:text-cyan-400 transition"
            >
              {tab.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
