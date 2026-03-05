"use client";

import { LayoutDashboard, X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type Props = {
  widgetId: string | null;
  isOpen: boolean;
  label: string;
  isMobile: boolean;
  position: { x: number; y: number };
  size: { w: number; h: number };
  minimized: boolean;
  onClose: () => void;
  onToggleMinimized: () => void;
  onMaximize: () => void;
  onTitleDown: (event: ReactPointerEvent) => void;
  onResizeDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: () => void;
  renderWidget: (id: string, size: WidgetSize, inPopout?: boolean) => ReactNode;
};

export default function DashboardWidgetPopout({
  widgetId,
  isOpen,
  label,
  isMobile,
  position,
  size,
  minimized,
  onClose,
  onToggleMinimized,
  onMaximize,
  onTitleDown,
  onResizeDown,
  onPointerMove,
  onPointerUp,
  renderWidget,
}: Props) {
  if (!isOpen || !widgetId) {
    return null;
  }

  return (
    <div
      className={`fixed z-[10000] flex flex-col overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.55)] ${isMobile ? "rounded-none border-0" : "rounded-2xl border border-gray-700/70"}`}
      style={{
        left: isMobile ? 0 : position.x,
        top: isMobile ? 0 : position.y,
        width: isMobile ? "100vw" : size.w,
        height: minimized ? "auto" : isMobile ? "100dvh" : size.h,
      }}
    >
      <div
        className={`flex items-center gap-3 px-4 h-11 bg-gray-900 select-none shrink-0 ${isMobile ? "" : "cursor-grab active:cursor-grabbing"}`}
        onPointerDown={isMobile ? undefined : onTitleDown}
        onPointerMove={isMobile ? undefined : onPointerMove}
        onPointerUp={isMobile ? undefined : onPointerUp}
      >
        <div className="flex items-center gap-1.5" onPointerDown={(event) => event.stopPropagation()}>
          <button
            onClick={onClose}
            className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors"
            title="Close"
          >
            <X size={7} className="text-red-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            onClick={onToggleMinimized}
            className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors"
            title={minimized ? "Restore" : "Minimise"}
          />
          {!isMobile && (
            <button
              onClick={onMaximize}
              className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
              title="Maximise"
            />
          )}
        </div>
        <LayoutDashboard size={14} className="text-[#FF4D00] ml-1 shrink-0" />
        <span className="text-[13px] font-semibold text-white/90 flex-1 text-center -ml-8 pointer-events-none">
          {label}
        </span>
      </div>

      {!minimized && <div className="flex-1 overflow-auto bg-[#ECEEF2] p-4">{renderWidget(widgetId, "lg", true)}</div>}

      {!minimized && !isMobile && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
          style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.18) 50%)" }}
          onPointerDown={onResizeDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      )}
    </div>
  );
}
