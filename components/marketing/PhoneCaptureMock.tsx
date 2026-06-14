"use client";

import Image from "next/image";
import { ChevronLeft, Ghost, RotateCcw, Trash2 } from "lucide-react";

type Props = {
  image: string;
  variant: "sitewalk" | "twin";
  accentVar: "--graphite-primary" | "--twin360-blue";
  label: string;
};

/**
 * Marketing mock phone: a real construction-site photo full-bleed inside the
 * device frame, with an accurate recreation of the Slate360 capture UI overlaid
 * (matches the live app: top mode pills + Ghost, bottom shutter + side controls
 * + hint line; Twin adds a VIDEO/PHOTOS toggle). No notch.
 */
export function PhoneCaptureMock({ image, variant, accentVar, label }: Props) {
  const accent = `var(${accentVar})`;
  const isTwin = variant === "twin";

  return (
    <figure className="mx-auto flex w-full max-w-[300px] flex-col items-center gap-4" aria-label={label}>
      <div
        className="relative w-full overflow-hidden rounded-[2.2rem] border-[6px] border-[#1A222C] bg-black"
        style={{ aspectRatio: "390 / 844", boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent)` }}
      >
        <Image src={image} alt={label} fill sizes="300px" className="object-cover" priority />

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 bg-gradient-to-b from-black/55 to-transparent px-2.5 pb-7 pt-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm">
            <ChevronLeft className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {isTwin ? (
              <span className="truncate rounded-md bg-black/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                Quick Scans · Ready
              </span>
            ) : (
              <>
                <span className="rounded-md bg-black/50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                  Stop 1
                </span>
                <span
                  className="rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: "rgba(220,38,38,0.85)" }}
                >
                  End
                </span>
              </>
            )}
          </div>
          <span
            className="flex shrink-0 items-center gap-1 rounded-full border border-white/25 bg-black/40 px-2 py-1 text-[9px] font-semibold text-white/90 backdrop-blur-sm"
          >
            <Ghost className="h-3 w-3" /> Ghost
          </span>
        </div>

        {/* Bottom controls */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pb-4 pt-10">
          {isTwin ? (
            <div className="inline-flex overflow-hidden rounded-full border border-white/25 bg-black/40 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <span className="px-3 py-1 text-white/60">Video</span>
              <span className="px-3 py-1 text-[var(--graphite-canvas)]" style={{ backgroundColor: accent }}>Photos</span>
            </div>
          ) : null}

          <p className="text-[10px] font-medium text-white/80">
            {isTwin ? "Tap blue to start · red to stop · check + review" : "Tap to capture · hold for sources"}
          </p>

          <div className="flex w-full items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-black/35 text-white/85">
              {isTwin ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            </span>

            {/* Shutter */}
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/90">
              <span className="h-10 w-10 rounded-full" style={{ backgroundColor: accent }} />
            </span>

            {!isTwin ? (
              <span
                className="rounded-full px-3 py-2 text-[10px] font-bold text-[var(--graphite-canvas)]"
                style={{ backgroundColor: accent }}
              >
                End walk
              </span>
            ) : (
              <span className="h-9 w-9" aria-hidden />
            )}
          </div>
        </div>
      </div>

      <figcaption className="min-h-10 text-center text-sm font-medium text-[var(--graphite-text-body)]">
        {isTwin
          ? "Walk the space — Twin 360 captures clips for your 3D model."
          : "Capture photos and pin issues to plans as you walk the site."}
      </figcaption>
    </figure>
  );
}
