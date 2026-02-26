/**
 * ═══════════════════════════════════════════════════════════════
 * Shared WidgetCard — SINGLE card wrapper used by both
 * DashboardClient and ProjectHub.
 *
 * Features:
 *  • Uniform visual treatment (rounded-2xl, border, shadow, p-6)
 *  • Single expand/collapse button (top-right)
 *  • Built-in HTML5 drag-and-drop support
 *  • Optional `action` slot for extra controls in the header
 * ═══════════════════════════════════════════════════════════════
 */
"use client";

import React from "react";
import { Maximize2, Minimize2, type LucideIcon } from "lucide-react";

export interface WidgetCardProps {
  icon: LucideIcon;
  title: string;
  /** Extra controls rendered to the left of the expand button */
  action?: React.ReactNode;
  /** Column-span class for CSS grid (e.g. "md:col-span-2 xl:col-span-3") */
  span?: string;
  children: React.ReactNode;
  delay?: number;
  color?: string;
  onExpand?: () => void;
  isExpanded?: boolean;
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
  onExpand,
  isExpanded,
  draggable: isDraggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false,
}: WidgetCardProps) {
  return (
    <div
      draggable={isDraggable && !isExpanded}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={[
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-6",
        "hover:shadow-lg hover:border-gray-200 transition-all duration-300 flex flex-col",
        // Pin all unexpanded cards to the same minimum height so the widget grid stays uniform
        !isExpanded ? "min-h-[260px]" : "",
        isDraggable && !isExpanded
          ? "cursor-grab active:cursor-grabbing"
          : "",
        isDragging ? "opacity-50 scale-95" : "",
        span ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 inline-flex items-center rounded-md border border-fuchsia-300 bg-fuchsia-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-900">
        Unified Widget Card · Probe U1
      </div>

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

        <div className="flex items-center gap-2">
          {action}
          {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <Minimize2 size={13} />
              ) : (
                <Maximize2 size={13} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      {children}
    </div>
  );
}
