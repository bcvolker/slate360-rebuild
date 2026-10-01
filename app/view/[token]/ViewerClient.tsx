"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Info, Share2, Printer, Pencil, Check, Map } from "lucide-react";
import type { ViewerDeliverable } from "@/lib/site-walk/viewer-types";
import { ExternalPortalShell, PublicItemStage, DeliverablePlanStage } from "@/components/external-portal";
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
  /** When true (owner preview), the header title is editable — so the walk/project name
   * isn't forced onto stakeholders. Edit BEFORE publishing/sharing so it's captured. */
  editableTitle?: boolean;
}

export default function ViewerClient({ deliverable, token, backHref, editableTitle }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  const hasPlan = Boolean(deliverable.planSheets && deliverable.planSheets.length > 0);
  const [title, setTitle] = useState(deliverable.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(deliverable.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleSaveFailed, setTitleSaveFailed] = useState(false);

  const saveTitle = useCallback(async () => {
    const next = titleDraft.trim();
    if (!next || next === title) return setEditingTitle(false);
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/site-walk/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) throw new Error("save failed");
      setTitle(next);
      setTitleSaveFailed(false);
      setEditingTitle(false);
    } catch {
      setTitleSaveFailed(true); // leave editor open + surface the failure for a retry
    } finally {
      setSavingTitle(false);
    }
  }, [titleDraft, title, deliverable.id]);

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

  // On a phone the details panel covers the photo, so start with the photo.
  useEffect(() => setPanelOpen(!window.matchMedia("(max-width: 767px)").matches), []);

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
          className="mr-1 inline-flex min-h-[48px] items-center gap-1 rounded-lg border border-[var(--portal-line)] px-2.5 text-sm font-medium text-[var(--portal-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)] hover:text-[var(--portal-accent)]"
          aria-label="Back to deliverables"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </a>
      ) : null}
      {editableTitle ? (
        <button
          type="button"
          onClick={() => {
            setTitleDraft(title);
            setEditingTitle(true);
          }}
          className="rounded-lg p-2 text-[var(--portal-ink-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)] hover:text-[var(--portal-accent)]"
          aria-label="Edit the title shown to recipients"
          title="Edit title"
        >
          <Pencil size={16} />
        </button>
      ) : null}
      <span className="mr-1 hidden text-xs text-[var(--portal-ink-muted)] sm:inline">
        {activeIndex + 1} / {items.length}
      </span>
      <button
        type="button"
        onClick={handleShare}
        className="rounded-lg p-2 text-[var(--portal-ink-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)] hover:text-[var(--portal-accent)]"
        aria-label="Share"
      >
        <Share2 size={16} />
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="hidden rounded-lg p-2 text-[var(--portal-ink-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)] hover:text-[var(--portal-accent)] sm:block"
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
            ? "bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)] text-[var(--portal-accent)]"
            : "text-[var(--portal-ink-muted)] hover:bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)] hover:text-[var(--portal-accent)]",
        )}
        aria-label="Toggle details"
      >
        <Info size={16} />
      </button>
      {hasPlan ? (
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          className="rounded-lg p-2 text-[var(--portal-ink-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--portal-accent)_15%,transparent)] hover:text-[var(--portal-accent)]"
          aria-label="View plan"
          title="View plan"
        >
          <Map size={16} />
        </button>
      ) : null}
    </>
  );

  return (
    <ExternalPortalShell
      variant="immersive"
      showFooter={false}
      portalLabel="Deliverable review"
      title={title}
      subtitle={`Shared by ${deliverable.senderName}`}
      orgLogoUrl={deliverable.senderLogo}
      headerActions={headerActions}
      className="h-screen"
    >
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      {/* Inline title editor (owner only) — change the text stakeholders see before sharing. */}
      {editableTitle && editingTitle ? (
        <div className="flex items-center gap-2 border-b border-[var(--portal-line)] bg-[var(--portal-surface)]/95 px-4 py-2 backdrop-blur-sm">
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            maxLength={140}
            placeholder="Title shown to recipients"
            aria-label="Deliverable title"
            className="min-h-[44px] flex-1 rounded-lg border border-[var(--portal-line)] bg-[var(--portal-canvas-alt)] px-3 text-sm text-[var(--portal-ink)] outline-none focus:border-[var(--portal-accent)]"
          />
          {titleSaveFailed ? (
            <span className="text-xs font-medium text-[var(--destructive)]">Couldn&apos;t save — retry</span>
          ) : null}
          <button
            type="button"
            onClick={() => void saveTitle()}
            disabled={savingTitle}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[var(--portal-accent)] px-3 text-sm font-black text-white disabled:opacity-60"
          >
            <Check size={16} /> Save
          </button>
          <button
            type="button"
            onClick={() => setEditingTitle(false)}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--portal-line)] px-3 text-sm text-[var(--portal-ink-muted)]"
          >
            Cancel
          </button>
        </div>
      ) : null}
      {/* Info rail (LEFT on desktop) + media stage */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {planOpen && deliverable.planSheets && deliverable.planPins ? (
          <DeliverablePlanStage
            sheets={deliverable.planSheets}
            pins={deliverable.planPins}
            onSelectItem={(itemId) => {
              const idx = items.findIndex((it) => it.id === itemId);
              if (idx >= 0) {
                setActiveIndex(idx);
                try {
                  window.localStorage.setItem(storageKey, String(idx));
                } catch {
                  /* ignore */
                }
              }
              setPlanOpen(false);
            }}
            onClose={() => setPlanOpen(false)}
          />
        ) : null}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[var(--portal-canvas-alt)] sm:order-2">
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
              className="absolute left-3 z-20 rounded-xl border border-[var(--portal-line)] bg-white/90 p-3 text-[var(--portal-ink)] backdrop-blur transition-colors hover:bg-white"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {activeIndex < items.length - 1 && (
            <button
              type="button"
              onClick={() => navigate(1)}
              className="absolute right-3 z-20 rounded-xl border border-[var(--portal-line)] bg-white/90 p-3 text-[var(--portal-ink)] backdrop-blur transition-colors hover:bg-white"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:hidden text-xs text-[var(--portal-ink-muted)] bg-white/90 backdrop-blur px-2 py-0.5 rounded">
            {activeIndex + 1} / {items.length}
          </div>
        </div>

        {panelOpen && (
          <aside className="w-full sm:w-96 absolute sm:relative inset-x-0 bottom-0 sm:inset-auto sm:order-1 bg-[var(--portal-surface)] border-[var(--portal-line)] sm:border-r flex flex-col shrink-0 max-h-[60vh] sm:max-h-none">
            <div className="p-4 border-b border-[var(--portal-line)] flex justify-between items-center">
              <h2 className="font-semibold text-sm text-foreground truncate">
                {activeItem.title || "Item details"}
              </h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-[var(--portal-ink-muted)] hover:text-foreground"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {activeItem.notes && (
                <p className="text-sm text-[var(--portal-ink)] mb-4 leading-relaxed whitespace-pre-wrap">
                  {activeItem.notes}
                </p>
              )}

              {activeItem.metadata?.ai_formatted && (
                activeItem.metadata?.note_raw ? (
                  <details className="mb-4 rounded-md border border-[var(--portal-line)] bg-[var(--portal-canvas-alt)]">
                    <summary className="cursor-pointer list-none px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--portal-ink-muted)] select-none">
                      ✦ AI-formatted · view original
                    </summary>
                    <p className="border-t border-[var(--portal-line)] px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-[var(--portal-ink-muted)]">
                      {activeItem.metadata.note_raw}
                    </p>
                  </details>
                ) : (
                  <p
                    className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--portal-line)] bg-[var(--portal-canvas-alt)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--portal-ink-muted)]"
                    title="This note was AI-formatted for clarity from the inspector's original field text, which is preserved on the record."
                  >
                    ✦ AI-formatted · original preserved
                  </p>
                )
              )}

              <div className="space-y-1.5 mb-6 text-xs text-[var(--portal-ink-muted)] bg-[var(--portal-canvas-alt)] p-3 rounded">
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
      <footer className="h-20 bg-[var(--portal-surface)] border-t border-[var(--portal-line)] flex items-center px-3 gap-2 overflow-x-auto shrink-0">
        {items.map((it, idx) => (
          <button
            key={it.id}
            type="button"
            ref={activeIndex === idx ? activeThumbRef : undefined}
            onClick={() => setActiveIndex(idx)}
            className={cn(
              "h-14 min-w-[88px] bg-[var(--portal-canvas-alt)] border-2 rounded overflow-hidden relative transition-all",
              activeIndex === idx
                ? "border-[var(--portal-accent)]"
                : "border-transparent opacity-60 hover:opacity-100"
            )}
            aria-label={`Go to item ${idx + 1}`}
          >
            {it.url && (it.type === "photo" || it.type === "photo_360") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.url} className="object-cover w-full h-full" alt="" />
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] text-[var(--portal-ink-muted)] uppercase">
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
      <span className="text-[var(--portal-ink-muted)]">{label}</span>
      <span className="text-[var(--portal-ink)] text-right truncate">{value}</span>
    </div>
  );
}
