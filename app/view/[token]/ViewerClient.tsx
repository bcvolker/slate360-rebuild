"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Info, Share2, Printer } from "lucide-react";
import type { ViewerDeliverable } from "@/lib/site-walk/viewer-types";
import { ExternalPortalShell, PublicItemStage } from "@/components/external-portal";
import { cn } from "@/lib/utils";
import CommentThread from "./CommentThread";

interface Props {
  deliverable: ViewerDeliverable;
  /** Share token when viewed via a public link; omitted for the authenticated
   * owner preview (`/site-walk/deliverables/[id]`), which has no token. */
  token?: string;
  /** When set (authenticated owner preview), render an in-app back control so the
   * owner isn't trapped in the immersive viewer with only browser-back. */
  backHref?: string;
}

export default function ViewerClient({ deliverable, token, backHref }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

  const items = deliverable.items;
  const activeItem = items[activeIndex];
  // Resume key falls back to the deliverable id for the token-less owner preview.
  const storageKey = `slate360_view_${token ?? deliverable.id}`;

  // Restore last-viewed index per viewer
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const idx = parseInt(saved, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < items.length) {
        setActiveIndex(idx);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey, items.length]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((prev) => {
        const next = Math.max(0, Math.min(items.length - 1, prev + dir));
        try {
          window.localStorage.setItem(storageKey, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [items.length, storageKey]
  );

  // Preload adjacent media so crossfades land on a decoded image, not a flash.
  useEffect(() => {
    for (const d of [1, -1]) {
      const it = items[activeIndex + d];
      if (it?.url && (it.type === "photo" || it.type === "photo_360")) {
        const img = new window.Image();
        img.src = it.url;
      }
    }
  }, [activeIndex, items]);

  // Keep the active thumbnail centered in the timeline.
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  // Interactive items (360 pan/zoom) consume arrow keys themselves; don't let
  // the deck steal them to flip slides while a recipient is exploring.
  const activeIsInteractive = activeItem?.type === "photo_360";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanelOpen(false);
        return;
      }
      if (activeIsInteractive) return;
      if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "ArrowLeft") navigate(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, activeIsInteractive]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = {
      title: deliverable.title,
      text: `${deliverable.senderName} shared a deliverable with you`,
      url,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  if (!activeItem) {
    return null;
  }

  const meta = activeItem.metadata ?? {};
  const vis = deliverable.metadataVisibility ?? {};

  const headerActions = (
    <>
      {backHref ? (
        <a
          href={backHref}
          className="mr-1 inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-white/10 px-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] hover:text-[var(--graphite-primary)]"
          aria-label="Back to deliverables"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </a>
      ) : null}
      <span className="mr-1 hidden text-xs text-slate-400 sm:inline">
        {activeIndex + 1} / {items.length}
      </span>
      <button
        type="button"
        onClick={handleShare}
        className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] hover:text-[var(--graphite-primary)]"
        aria-label="Share"
      >
        <Share2 size={16} />
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="hidden rounded-lg p-2 text-slate-300 transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] hover:text-[var(--graphite-primary)] sm:block"
        aria-label="Print"
      >
        <Printer size={16} />
      </button>
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className={cn(
          "rounded-lg p-2 transition-colors",
          panelOpen
            ? "bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] text-[var(--graphite-primary)]"
            : "text-slate-300 hover:bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] hover:text-[var(--graphite-primary)]",
        )}
        aria-label="Toggle details"
      >
        <Info size={16} />
      </button>
    </>
  );

  return (
    <ExternalPortalShell
      variant="immersive"
      showFooter={false}
      portalLabel="Deliverable review"
      title={deliverable.title}
      subtitle={`Shared by ${deliverable.senderName}`}
      orgLogoUrl={deliverable.senderLogo}
      headerActions={headerActions}
      className="h-screen"
    >
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      {/* Info rail (LEFT on desktop) + media stage */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black sm:order-2">
          {/* Keyed wrapper → gentle fade-in on each slide change (crossfade feel) */}
          <div
            key={activeItem.id}
            className="absolute inset-0 flex items-center justify-center animate-in fade-in-0 duration-300 ease-out motion-reduce:animate-none motion-reduce:duration-0"
          >
            <PublicItemStage item={activeItem} />
          </div>

          {activeIndex > 0 && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="absolute left-3 z-20 rounded-full bg-[#151A23]/80 p-3 text-[#0C0A09] backdrop-blur transition-colors hover:bg-[var(--graphite-primary)]"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {activeIndex < items.length - 1 && (
            <button
              type="button"
              onClick={() => navigate(1)}
              className="absolute right-3 z-20 rounded-full bg-[#151A23]/80 p-3 text-[#0C0A09] backdrop-blur transition-colors hover:bg-[var(--graphite-primary)]"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:hidden text-xs text-slate-300 bg-[#151A23]/80 backdrop-blur px-2 py-0.5 rounded">
            {activeIndex + 1} / {items.length}
          </div>
        </div>

        {panelOpen && (
          <aside className="w-full sm:w-96 absolute sm:relative inset-x-0 bottom-0 sm:inset-auto sm:order-1 bg-[#151A23] border-white/10 sm:border-r flex flex-col shrink-0 max-h-[60vh] sm:max-h-none">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="font-semibold text-sm text-foreground truncate">
                {activeItem.title || "Item details"}
              </h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-slate-400 hover:text-foreground"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {activeItem.notes && (
                <p className="text-sm text-slate-200 mb-4 leading-relaxed whitespace-pre-wrap">
                  {activeItem.notes}
                </p>
              )}

              {activeItem.metadata?.ai_formatted && (
                activeItem.metadata?.note_raw ? (
                  <details className="mb-4 rounded-md border border-white/10 bg-white/[0.04]">
                    <summary className="cursor-pointer list-none px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 select-none">
                      ✦ AI-formatted · view original
                    </summary>
                    <p className="border-t border-white/10 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-slate-400">
                      {activeItem.metadata.note_raw}
                    </p>
                  </details>
                ) : (
                  <p
                    className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400"
                    title="This note was AI-formatted for clarity from the inspector's original field text, which is preserved on the record."
                  >
                    ✦ AI-formatted · original preserved
                  </p>
                )
              )}

              <div className="space-y-1.5 mb-6 text-xs text-slate-300 bg-black/30 p-3 rounded">
                {vis.timestamp && meta.timestamp && (
                  <Row label="Time" value={new Date(meta.timestamp).toLocaleString()} />
                )}
                {vis.gps && meta.gps && (
                  <Row
                    label="Location"
                    value={`${meta.gps.lat.toFixed(5)}, ${meta.gps.lng.toFixed(5)}`}
                  />
                )}
                {vis.weather && meta.weather && (
                  <Row label="Weather" value={meta.weather} />
                )}
                {vis.author && meta.author && <Row label="By" value={meta.author} />}
                {vis.device && meta.device && (
                  <Row label="Device" value={meta.device} />
                )}
              </div>

              {token && (
                <CommentThread
                  deliverableId={deliverable.id}
                  itemId={activeItem.id}
                  token={token}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Thumbnail strip */}
      <footer className="h-20 bg-[#151A23] border-t border-white/10 flex items-center px-3 gap-2 overflow-x-auto shrink-0">
        {items.map((it, idx) => (
          <button
            key={it.id}
            type="button"
            ref={activeIndex === idx ? activeThumbRef : undefined}
            onClick={() => setActiveIndex(idx)}
            className={cn(
              "h-14 min-w-[88px] bg-black border-2 rounded overflow-hidden relative transition-all",
              activeIndex === idx
                ? "border-[var(--graphite-primary)] shadow-[0_0_16px_-2px_color-mix(in_srgb,var(--graphite-primary)_55%,transparent)]"
                : "border-transparent opacity-60 hover:opacity-100"
            )}
            aria-label={`Go to item ${idx + 1}`}
          >
            {it.url && (it.type === "photo" || it.type === "photo_360") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.url} className="object-cover w-full h-full" alt="" />
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] text-slate-500 uppercase">
                {it.type.replace("_", " ")}
              </div>
            )}
          </button>
        ))}
      </footer>
      </div>
    </ExternalPortalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 text-right truncate">{value}</span>
    </div>
  );
}
