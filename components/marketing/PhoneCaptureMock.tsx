"use client";

import Image from "next/image";
import { Check, ChevronDown, ChevronLeft, Flashlight, Home, Maximize2 } from "lucide-react";

type Props = {
  image: string;
  variant: "sitewalk" | "twin";
  accentVar: "--graphite-primary" | "--twin360-blue";
  label: string;
};

/**
 * Marketing mock phone: a real construction-site photo full-bleed inside the
 * device frame, with a faithful recreation of the live Slate360 capture UI:
 *  - One unified dark top bar: back · colored mode label · (Site Walk: dropdown)
 *    · expand · (Site Walk: green-outline END) · home.
 *  - Bottom: Light button (left), shutter (Site Walk = hollow green ring,
 *    Twin = solid blue dot), and End walk ✓ / Done (right), with the hint line
 *    and (Twin) a VIDEO/PHOTOS toggle. Mirrors images/image0.png + image1.png.
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

        {/* Top bar — single unified dark pill */}
        <div className="absolute inset-x-0 top-0 z-10 px-2 pt-2.5">
          <div className="flex items-center gap-1.5 rounded-2xl bg-black/55 px-2 py-1.5 backdrop-blur-sm">
            <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-white/85" />
            <span
              className="flex-1 truncate text-[9px] font-extrabold uppercase tracking-wider"
              style={{ color: accent }}
            >
              {isTwin ? "Quick Scans · Ready" : "Stop 1"}
            </span>
            {!isTwin ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/70" /> : null}
            <Maximize2 className="h-3 w-3 shrink-0 text-white/70" />
            {!isTwin ? (
              <span
                className="shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider"
                style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 60%, transparent)` }}
              >
                End
              </span>
            ) : null}
            <Home className="h-3.5 w-3.5 shrink-0 text-white/70" />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pb-3.5 pt-10">
          {isTwin ? (
            <div className="inline-flex overflow-hidden rounded-full border border-white/25 bg-black/40 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <span className="px-3 py-1 text-white/55">Video</span>
              <span className="px-3 py-1 text-[var(--graphite-canvas)]" style={{ backgroundColor: accent }}>
                Photos
              </span>
            </div>
          ) : null}

          <span className="rounded-lg bg-black/45 px-2.5 py-1 text-[9px] font-medium text-white/85 backdrop-blur-sm">
            {isTwin ? "tap blue to start · red to stop · check = review" : "tap = capture · hold = sources"}
          </span>

          <div className="flex w-full items-end justify-between">
            {/* Light */}
            <span className="flex flex-col items-center gap-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/45 text-white/85 backdrop-blur-sm">
                <Flashlight className="h-4 w-4" />
              </span>
              <span className="text-[8px] font-semibold text-white/80">Light</span>
            </span>

            {/* Shutter */}
            {isTwin ? (
              <span
                className="h-14 w-14 rounded-full ring-2 ring-white/70"
                style={{ backgroundColor: accent }}
              />
            ) : (
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full border-4 bg-black/25"
                style={{ borderColor: accent }}
              >
                <span className="h-8 w-8 rounded-full ring-2" style={{ ["--tw-ring-color" as string]: accent }} />
              </span>
            )}

            {/* End walk (Site Walk) / Done (Twin) */}
            {isTwin ? (
              <span className="flex flex-col items-center gap-1">
                <span className="flex h-9 items-center justify-center rounded-xl bg-black/45 px-2.5 text-[9px] font-bold text-white/85 backdrop-blur-sm">
                  Done
                </span>
                <span className="text-[8px] font-semibold text-transparent">Done</span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--graphite-canvas)]"
                  style={{ backgroundColor: accent }}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="text-[8px] font-semibold text-white/80">End walk</span>
              </span>
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
