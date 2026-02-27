/**
 * ═══════════════════════════════════════════════════════════════
 * Shared Widget Customization Drawer
 * Right-side slide-over used by both Dashboard and ProjectHub.
 * ═══════════════════════════════════════════════════════════════
 */
"use client";

import React from "react";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { WidgetPref, WidgetMeta, WidgetSize } from "./widget-meta";
import { getWidgetSizeLabel } from "./widget-meta";

const SIZE_CYCLE: WidgetSize[] = ["default", "sm", "md", "lg"];

export interface WidgetCustomizeDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Full pref list (all widgets) */
  widgetPrefs: WidgetPref[];
  /** Meta array – may already be filtered for tier */
  widgetMeta: WidgetMeta[];
  onToggleVisible: (id: string) => void;
  onSetSize: (id: string, size: WidgetSize) => void;
  onMoveOrder: (id: string, dir: -1 | 1) => void;
  onReset: () => void;
  /** Optional "Save layout" action for Supabase persistence */
  onSave?: () => void;
  saving?: boolean;
  dirty?: boolean;
}

export default function WidgetCustomizeDrawer({
  open,
  onClose,
  title = "Customize Widgets",
  subtitle = "Reorder, show/hide, and resize widgets",
  widgetPrefs,
  widgetMeta,
  onToggleVisible,
  onSetSize,
  onMoveOrder,
  onReset,
  onSave,
  saving = false,
  dirty = false,
}: WidgetCustomizeDrawerProps) {
  if (!open) return null;

  const sorted = [...widgetPrefs].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {sorted.map((pref) => {
            const meta = widgetMeta.find((m) => m.id === pref.id);
            if (!meta) return null;
            const Icon = meta.icon;
            const pos = sorted.findIndex((p) => p.id === pref.id);
            const total = sorted.length;

            return (
              <div
                key={pref.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  pref.visible
                    ? "border-gray-200 bg-white"
                    : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => onMoveOrder(pref.id, -1)}
                    disabled={pos === 0}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => onMoveOrder(pref.id, 1)}
                    disabled={pos >= total - 1}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${meta.color}1A`,
                    color: meta.color,
                  }}
                >
                  <Icon size={15} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">
                    {meta.label}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {getWidgetSizeLabel(pref.size)}
                  </p>
                </div>

                {/* Size selector — D / S / M / L */}
                <div className="flex gap-0.5">
                  {SIZE_CYCLE.map((s) => (
                    <button
                      key={s}
                      onClick={() => onSetSize(pref.id, s)}
                      className={[
                        "w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center transition-colors",
                        pref.size === s
                          ? "bg-[#1E3A8A]/10 text-[#1E3A8A]"
                          : "text-gray-300 hover:text-gray-500 hover:bg-gray-100",
                      ].join(" ")}
                      title={getWidgetSizeLabel(s)}
                    >
                      {s === "default" ? "D" : s.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Visible toggle */}
                <button
                  onClick={() => onToggleVisible(pref.id)}
                  title={pref.visible ? "Hide widget" : "Show widget"}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    pref.visible
                      ? "bg-[#FF4D00]/10 text-[#FF4D00]"
                      : "text-gray-300 hover:text-gray-500"
                  }`}
                >
                  {pref.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          {dirty && (
            <p className="text-[10px] text-amber-600 text-center font-medium">
              You have unsaved changes
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onReset}
              className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Reset to default
            </button>
            {onSave && (
              <button
                onClick={onSave}
                disabled={saving || !dirty}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#FF4D00" }}
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                {saving ? "Saving…" : "Save layout"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
