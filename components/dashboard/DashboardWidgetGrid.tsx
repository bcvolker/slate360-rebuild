"use client";

import type { DragEvent, ReactNode } from "react";
import type { WidgetPref, WidgetSize } from "@/components/widgets/widget-meta";

type Props = {
  orderedVisible: WidgetPref[];
  dashDragIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (event: DragEvent, idx: number) => void;
  onDragEnd: () => void;
  getSpan: (id: string, size: WidgetSize) => string;
  renderWidget: (id: string, size: WidgetSize) => ReactNode;
};

export default function DashboardWidgetGrid({
  orderedVisible,
  dashDragIdx,
  onDragStart,
  onDragOver,
  onDragEnd,
  getSpan,
  renderWidget,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {orderedVisible.map((pref, idx) => (
        <div
          key={pref.id}
          draggable={(pref.size === "default" || pref.size === "sm") && pref.id !== "location"}
          onDragStart={() => onDragStart(idx)}
          onDragOver={(event) => onDragOver(event, idx)}
          onDragEnd={onDragEnd}
          className={`${pref.size !== "default" && pref.size !== "sm" ? "" : "cursor-grab active:cursor-grabbing"} ${dashDragIdx === idx ? "opacity-50 scale-95" : ""} ${getSpan(pref.id, pref.size)} transition-all duration-200`}
        >
          {renderWidget(pref.id, pref.size)}
        </div>
      ))}
    </div>
  );
}
