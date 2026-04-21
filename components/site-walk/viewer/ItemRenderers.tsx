"use client";

import type { ViewerItem } from "@/lib/site-walk/viewer-types";
import { Sparkles } from "lucide-react";

/**
 * Type-aware viewer item renderer. Phase 1 ships photo/video/voice/note;
 * 360 / 3D / thermal / time-lapse stubbed for Phase 2 (PR #27e-2) when the
 * heavier libraries land (`react-photo-sphere-viewer`, `<model-viewer>`).
 */
export function ItemRenderers({ item }: { item: ViewerItem }) {
  switch (item.type) {
    case "photo":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {item.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.title}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <Placeholder label={item.title || "Photo"} />
          )}
          {item.markupSvg && (
            <div
              className="absolute inset-0 pointer-events-none"
              dangerouslySetInnerHTML={{ __html: item.markupSvg }}
            />
          )}
        </div>
      );

    case "video":
    case "time_lapse":
      return item.url ? (
        <video
          src={item.url}
          controls
          className="max-w-full max-h-full outline-none"
        />
      ) : (
        <Placeholder label={item.title || "Video"} />
      );

    case "voice":
      return (
        <div className="p-8 max-w-xl w-full">
          <h2 className="text-xl font-semibold mb-4 text-cobalt">{item.title}</h2>
          {item.url && (
            <audio src={item.url} controls className="w-full mb-4" />
          )}
          {item.transcript && (
            <p className="text-sm text-slate-300 leading-relaxed bg-black/30 p-4 rounded">
              {item.transcript}
            </p>
          )}
        </div>
      );

    case "note":
      return (
        <div className="p-12 max-w-2xl text-left">
          <h2 className="text-2xl font-bold mb-6 text-cobalt">{item.title}</h2>
          <p className="text-lg text-slate-200 leading-relaxed whitespace-pre-wrap">
            {item.notes}
          </p>
        </div>
      );

    case "photo_360":
    case "tour_360":
    case "model_3d":
    case "thermal":
      return (
        <div className="flex flex-col items-center justify-center text-slate-400 gap-3 max-w-md text-center">
          <Sparkles className="h-12 w-12 text-cobalt" />
          <h3 className="text-lg font-semibold text-white">{item.title}</h3>
          <p className="text-sm">
            {labelFor(item.type)} viewer ships with the next Site Walk update.
          </p>
        </div>
      );

    default:
      return <Placeholder label="Unsupported item" />;
  }
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
      <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/10" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function labelFor(type: ViewerItem["type"]): string {
  switch (type) {
    case "photo_360":
      return "360 photo";
    case "tour_360":
      return "360 tour";
    case "model_3d":
      return "3D model";
    case "thermal":
      return "Thermal";
    default:
      return "Interactive";
  }
}
