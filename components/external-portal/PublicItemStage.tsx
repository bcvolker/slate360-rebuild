"use client";

import type { ViewerItem } from "@/lib/site-walk/viewer-types";
import { FileWarning } from "lucide-react";
import { PortalGlassCard } from "./PortalGlassCard";

/**
 * External deliverable item renderer for /view/[token].
 * Keeps Site Walk capture internals separate; no cobalt styling or roadmap copy.
 */
export function PublicItemStage({ item }: { item: ViewerItem }) {
  switch (item.type) {
    case "photo":
      return (
        <div className="relative flex h-full w-full items-center justify-center">
          {item.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.title}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <MediaUnavailable label={item.title || "Photo"} />
          )}
          {item.markupSvg ? (
            <div
              className="pointer-events-none absolute inset-0"
              dangerouslySetInnerHTML={{ __html: item.markupSvg }}
            />
          ) : null}
        </div>
      );

    case "video":
    case "time_lapse":
      return item.url ? (
        <video src={item.url} controls className="max-h-full max-w-full outline-none" />
      ) : (
        <MediaUnavailable label={item.title || "Video"} />
      );

    case "voice":
      return (
        <div className="w-full max-w-xl p-8">
          <h2 className="mb-4 text-xl font-semibold text-[var(--graphite-primary)]">{item.title}</h2>
          {item.url ? <audio src={item.url} controls className="mb-4 w-full" /> : null}
          {item.transcript ? (
            <p className="rounded-lg bg-black/30 p-4 text-sm leading-relaxed text-slate-300">
              {item.transcript}
            </p>
          ) : null}
          {!item.url && !item.transcript ? (
            <MediaUnavailable label="Voice note" compact />
          ) : null}
        </div>
      );

    case "note":
      return (
        <div className="max-w-2xl p-12 text-left">
          <h2 className="mb-6 text-2xl font-bold text-[var(--graphite-primary)]">{item.title}</h2>
          <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-200">
            {item.notes || "No note text was included with this item."}
          </p>
        </div>
      );

    case "photo_360":
    case "tour_360":
    case "model_3d":
    case "thermal":
      return (
        <UnsupportedItem
          title={item.title || labelFor(item.type)}
          typeLabel={labelFor(item.type)}
        />
      );

    default:
      return <MediaUnavailable label="Item" />;
  }
}

function MediaUnavailable({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <PortalGlassCard className={compact ? "!p-4 text-center" : "text-center"}>
      <FileWarning className="mx-auto mb-2 text-[var(--graphite-muted)]" size={compact ? 20 : 28} aria-hidden />
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-400">Media is unavailable for this shared link.</p>
    </PortalGlassCard>
  );
}

function UnsupportedItem({
  title,
  typeLabel,
}: {
  title: string;
  typeLabel: string;
}) {
  return (
    <PortalGlassCard className="max-w-md text-center">
      <FileWarning className="mx-auto mb-3 text-[var(--graphite-muted)]" size={32} aria-hidden />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        This shared {typeLabel} cannot be opened in the browser viewer. Contact the sender if
        you need the original file or package.
      </p>
    </PortalGlassCard>
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
      return "thermal capture";
    default:
      return "item";
  }
}
