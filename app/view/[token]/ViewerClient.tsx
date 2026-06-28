"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Info, Share2, Printer } from "lucide-react";
import type { ViewerDeliverable } from "@/lib/site-walk/viewer-types";
import { ExternalPortalShell, PublicItemStage } from "@/components/external-portal";
import { cn } from "@/lib/utils";
import CommentThread from "./CommentThread";

interface Props {
  deliverable: ViewerDeliverable;
  token: string;
}

export default function ViewerClient({ deliverable, token }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

  const items = deliverable.items;
  const activeItem = items[activeIndex];

  // Restore last-viewed index per token
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`slate360_view_${token}`);
      if (!saved) return;
      const idx = parseInt(saved, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < items.length) {
        setActiveIndex(idx);
      }
    } catch {
      /* ignore */
    }
  }, [token, items.length]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((prev) => {
        const next = Math.max(0, Math.min(items.length - 1, prev + dir));
        try {
          window.localStorage.setItem(`slate360_view_${token}`, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [items.length, token]
  );

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
      {/* Stage + side panel */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="flex-1 relative flex items-center justify-center bg-black">
          <PublicItemStage item={activeItem} />

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
          <aside className="w-full sm:w-96 absolute sm:relative inset-x-0 bottom-0 sm:inset-auto bg-[#151A23] border-l border-white/10 flex flex-col shrink-0 max-h-[60vh] sm:max-h-none">
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

              <CommentThread
                deliverableId={deliverable.id}
                itemId={activeItem.id}
                token={token}
              />
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
