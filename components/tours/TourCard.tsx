"use client";

import { useEffect, useState } from "react";
import { Globe, FileEdit, ImageIcon, Trash2 } from "lucide-react";

type TourCardRow = {
  id: string;
  title: string;
  status: "draft" | "published";
  updated_at: string;
};

/** Large preview card for the tour entry grid — self-fetches its first ready
 * scene's thumbnail so the list reads as a wall of real panoramas, not a
 * generic name-only list. */
export function TourCard({
  tour,
  onSelect,
  onDelete,
}: {
  tour: TourCardRow;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [sceneCount, setSceneCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch(`/api/tours/${tour.id}/scenes`);
      if (!r.ok || !alive) return;
      const json = await r.json();
      const scenes = (json?.data ?? json ?? []) as Array<{ id: string; status: string }>;
      if (!alive) return;
      setSceneCount(scenes.length);
      const firstReady = scenes.find((s) => s.status === "ready");
      if (!firstReady) return;
      const imgRes = await fetch(`/api/tours/${tour.id}/scenes/${firstReady.id}/image?variant=thumbnail`);
      if (!imgRes.ok || !alive) return;
      const imgJson = await imgRes.json();
      setThumbUrl((imgJson?.data ?? imgJson)?.url ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [tour.id]);

  return (
    <div
      onClick={onSelect}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-white/[0.02] transition hover:border-[var(--graphite-primary)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--graphite-canvas-deep)]">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={tour.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-[var(--graphite-muted)]">
            <ImageIcon className="size-6" />
          </div>
        )}
        <span
          className={`absolute right-2 top-2 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium backdrop-blur ${
            tour.status === "published"
              ? "bg-[color-mix(in_srgb,var(--graphite-primary)_28%,black_40%)] text-[var(--graphite-primary)]"
              : "bg-black/50 text-[var(--graphite-muted)]"
          }`}
        >
          {tour.status === "published" ? (
            <>
              <Globe className="size-3" /> Published
            </>
          ) : (
            <>
              <FileEdit className="size-3" /> Draft
            </>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--graphite-text-header)]">{tour.title}</p>
          <p className="text-[11px] text-[var(--graphite-muted)]">
            {sceneCount === null ? "…" : `${sceneCount} scene${sceneCount === 1 ? "" : "s"}`} · {formatDate(tour.updated_at)}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded p-1.5 text-[var(--graphite-muted)] opacity-0 transition hover:text-red-400 group-hover:opacity-100"
          aria-label="Delete tour"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
