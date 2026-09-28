"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, MapPin, X } from "lucide-react";
import { ROOM213_PINS } from "@/lib/room213/pins";

export type SheetState = { kind: "pin"; id: string } | { kind: "room" } | null;

/**
 * One content sheet for pins and room information: right side sheet on wide screens, bottom sheet on phones.
 * Visible Close + Escape (handled by the experience), focus moves in and returns on close, normal scrolling and
 * pinch-zoom inside (touch-action restored). The camera is untouched while it is open.
 */
const ACTION =
  "inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mkt-brand-green)]";

export function ContentSheet({
  state,
  onClose,
  onOpenPin,
  onViewInRoom,
}: {
  state: SheetState;
  onClose: () => void;
  onOpenPin: (id: string) => void;
  /** Close the sheet and walk to a spot facing the pin. */
  onViewInRoom: (id: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state) {
      returnFocus.current ??= document.activeElement as HTMLElement | null;
      closeRef.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current.focus?.({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [state]);

  if (!state) return null;
  const pin = state.kind === "pin" ? ROOM213_PINS.find((p) => p.pin_id === state.id) : null;
  const title = pin ? pin.title : "Room information";

  return (
    <aside
      data-r213-ui
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className="absolute inset-x-0 bottom-0 z-40 max-h-[72%] overflow-y-auto overscroll-contain rounded-t-2xl bg-[var(--mkt-surface)] text-[var(--mkt-ink)] shadow-2xl landscape:inset-x-auto landscape:bottom-0 landscape:right-0 landscape:top-0 landscape:max-h-none landscape:w-[min(42%,380px)] landscape:rounded-none landscape:rounded-l-2xl sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-0 sm:max-h-none sm:w-[min(42%,380px)] sm:rounded-none sm:rounded-l-2xl"
      style={{ touchAction: "auto", paddingBottom: "env(safe-area-inset-bottom)", paddingRight: "env(safe-area-inset-right)" }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <header className="sticky top-0 flex items-start justify-between gap-3 bg-[var(--mkt-surface)] px-5 pb-2 pt-4">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--mkt-brand-green)]">
            {pin ? pin.content[0]?.type.toUpperCase() : "PAYNE HALL"}
          </p>
          <h2 className="text-[17px] font-semibold leading-snug">{title}</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-[var(--mkt-ink)] hover:bg-[var(--mkt-canvas-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mkt-brand-green)]"
        >
          <X className="size-4" aria-hidden /> Close
        </button>
      </header>
      <div className="space-y-4 px-5 pb-6">
        {pin ? (
          <>
            <p className="text-[14px] leading-relaxed text-[var(--mkt-ink-muted)]">{pin.description}</p>
            <button type="button" onClick={() => onViewInRoom(pin.pin_id)} className={`${ACTION} border border-[var(--mkt-accent-line)] text-[var(--mkt-brand-green)] hover:bg-[var(--mkt-accent-soft)]`}>
              <MapPin className="size-4" aria-hidden /> View in room
            </button>
            {pin.content.map((c) => (
              <figure key={c.url} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.url} alt={c.title} className="w-full rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)]" />
                <figcaption className="flex items-center justify-between text-[12px] text-[var(--mkt-ink-muted)]">
                  <span>{c.title}</span>
                  {c.type === "drawing" ? (
                    <a href={c.url} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-[var(--mkt-brand-green)]">
                      Open original <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </>
        ) : (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
              <dt className="text-[var(--mkt-ink-muted)]">Building</dt>
              <dd>Payne Hall</dd>
              <dt className="text-[var(--mkt-ink-muted)]">Room</dt>
              <dd>213</dd>
              <dt className="text-[var(--mkt-ink-muted)]">Captured</dt>
              <dd>21 September 2026</dd>
              <dt className="text-[var(--mkt-ink-muted)]">Type</dt>
              <dd>Interactive Spatial Capture</dd>
            </dl>
            <p className="text-[12px] leading-relaxed text-[var(--mkt-ink-muted)]">
              A photographic 3D capture for review. It is not a measured survey; distances in the view are not to scale.
            </p>
            <div>
              <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--mkt-ink-muted)]">
                IN THIS ROOM · {ROOM213_PINS.length} ITEMS
              </p>
              <ul className="divide-y divide-[var(--mkt-line)]">
                {ROOM213_PINS.map((p) => (
                  <li key={p.pin_id} className="flex min-h-[52px] items-center justify-between gap-2 py-1">
                    <span className="text-[14px] leading-snug">{p.title}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => onOpenPin(p.pin_id)} className={`${ACTION} text-[var(--mkt-ink)] hover:bg-[var(--mkt-canvas-alt)]`} aria-label={`Open ${p.title}`}>
                        Open
                      </button>
                      <button type="button" onClick={() => onViewInRoom(p.pin_id)} className={`${ACTION} text-[var(--mkt-brand-green)] hover:bg-[var(--mkt-accent-soft)]`} aria-label={`View ${p.title} in room`}>
                        <MapPin className="size-4" aria-hidden /> View in room
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
