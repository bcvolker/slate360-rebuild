/**
 * ═══════════════════════════════════════════════════════════════
 * Shared WidgetCard — SINGLE card wrapper used by both
 * DashboardClient and ProjectHub.
 *
 * Features:
 *  • Uniform visual treatment (rounded-2xl, border, shadow, p-6)
 *  • 4 sizes: default / sm / md / lg  (buttons in header)
 *  • Built-in HTML5 drag-and-drop support
 *  • Optional `action` slot for extra controls in the header
 * ═══════════════════════════════════════════════════════════════
 */
"use client";

import React from "react";
import { Minimize2, type LucideIcon } from "lucide-react";
import type { WidgetSize } from "@/components/widgets/widget-meta";
import { getWidgetHeight } from "@/components/widgets/widget-meta";

/**
 * Horizontal-line expansion icons — 1 line = small, 2 = medium, 3 = large.
 * Matches the desktop line-icon pattern for expand controls.
 */
function ExpansionIcon({ lines }: { lines: 1 | 2 | 3 }) {
  const lineClass = "w-3 h-[1.5px] rounded-full bg-current";
  return (
    <span className="flex flex-col items-center justify-center gap-[2.5px]">
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className={lineClass} />
      ))}
    </span>
  );
}

const SIZE_OPTIONS: { value: "sm" | "md" | "lg"; lines: 1 | 2 | 3; label: string }[] = [
  { value: "sm", lines: 1, label: "Small" },
  { value: "md", lines: 2, label: "Medium" },
  { value: "lg", lines: 3, label: "Large" },
];

export interface WidgetCardProps {
  icon: LucideIcon;
  title: string;
  /** Extra controls rendered to the left of the size buttons */
  action?: React.ReactNode;
  /** Column-span class for CSS grid (e.g. "md:col-span-2 xl:col-span-3") */
  span?: string;
  children: React.ReactNode;
  delay?: number;
  color?: string;
  /** Current widget size */
  size?: WidgetSize;
  /** Callback to change size */
  onSetSize?: (size: WidgetSize) => void;
  /* ── drag support ─────────────────── */
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export default function WidgetCard({
  icon: Icon,
  title,
  action,
  span,
  children,
  delay = 0,
  color = "#FF4D00",
  size = "default",
  onSetSize,
  draggable: isDraggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false,
}: WidgetCardProps) {
  const isDefault = size === "default";

  return (
    <div
      draggable={isDraggable && isDefault}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={[
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-6",
        "hover:shadow-lg hover:border-gray-200 transition-all duration-300 flex flex-col",
        getWidgetHeight(size),
        isDraggable && isDefault
          ? "cursor-grab active:cursor-grabbing"
          : "",
        isDragging ? "opacity-50 scale-95" : "",
        span ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}1A`, color }}
          >
            <Icon size={20} />
          </div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>

        <div className="flex items-center gap-1">
          {action}
          {onSetSize && (
            <>
              {/* Size buttons – horizontal line expansion icons */}
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetSize(size === opt.value ? "default" : opt.value);
                  }}
                  className={[
                    "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                    size === opt.value
                      ? "bg-white shadow-sm text-[#1E3A8A]"
                      : "text-gray-400 hover:text-gray-600",
                  ].join(" ")}
                  title={`${opt.label} size`}
                >
                  <ExpansionIcon lines={opt.lines} />
                </button>
              ))}
              </div>
              {/* Reset to default when expanded */}
              {!isDefault && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetSize("default");
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors ml-0.5"
                  title="Reset to default size"
                >
                  <Minimize2 size={13} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
