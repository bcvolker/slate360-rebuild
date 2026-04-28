"use client";

import { Camera, Check, Ghost, LogOut, Plus } from "lucide-react";
import { useState } from "react";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { requestCameraCapture } from "./capture-camera-events";
import { CameraViewfinder } from "./CameraViewfinder";
import { UnifiedVectorToolbar } from "./UnifiedVectorToolbar";

type Props = {
  sessionId: string;
  autoOpenCamera: boolean;
  launchId: string | null;
  items: CaptureItemRecord[];
  activeItemId: string | null;
  modeLabel: string;
  ghostImageUrl: string | null;
  onMarkupChange: (itemId: string, markup: MarkupData) => void;
  onSelectItem: (item: CaptureItemRecord) => void;
  onNext: () => void;
};

export function VisualCaptureView({ sessionId, autoOpenCamera, launchId, items, activeItemId, modeLabel, ghostImageUrl, onMarkupChange, onSelectItem, onNext }: Props) {
  const [ghostOn, setGhostOn] = useState(false);
  const photoItems = items.filter((item) => item.item_type === "photo");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3">
        <a href="/site-walk" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-sm font-black text-white/90">
          <LogOut className="h-4 w-4" /> End
        </a>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-black">Visual capture</p>
          <p className="text-[11px] font-bold text-white/55">{modeLabel} · snap, mark up, swipe to notes</p>
        </div>
        <button type="button" onClick={onNext} className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white">
          Next <Check className="h-4 w-4" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full min-h-0">
          <CameraViewfinder sessionId={sessionId} autoOpenCamera={autoOpenCamera} launchId={launchId} layout="visual" onMarkupChange={onMarkupChange} />
          {ghostOn && ghostImageUrl && <img src={ghostImageUrl} alt="Previous progress ghost overlay" className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-30 mix-blend-screen" />}
        </div>
      </main>

      <div className="shrink-0 border-t border-white/10 bg-slate-900/95 px-3 py-2">
        <button type="button" onClick={() => setGhostOn((current) => !current)} disabled={!ghostImageUrl} className={`mb-2 inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-black ${ghostOn ? "border-blue-400 bg-blue-500/20 text-blue-100" : "border-white/15 bg-white/10 text-white/80 disabled:opacity-40"}`}>
          <Ghost className="h-4 w-4" /> Ghost Overlay
        </button>
        <UnifiedVectorToolbar />
        <div className="mt-2 flex h-20 gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Captured angles">
          <button type="button" onClick={() => requestCameraCapture("camera", "next_item")} className="flex h-16 min-w-16 flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/10 text-[11px] font-black text-white">
            <Plus className="h-5 w-5" /> Angle
          </button>
          {photoItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item)}
              className={`h-16 min-w-16 overflow-hidden rounded-2xl border ${item.id === activeItemId ? "border-blue-400" : "border-white/15"}`}
              aria-label={`Open ${item.title || "captured angle"}`}
            >
              {item.local_preview_url ? (
                <img src={item.local_preview_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/10"><Camera className="h-5 w-5" /></span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
