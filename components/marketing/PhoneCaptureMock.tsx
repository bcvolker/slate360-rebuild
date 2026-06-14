"use client";

import Image from "next/image";
import { ChevronLeft, Layers, MapPin, Video, Zap } from "lucide-react";

type Props = {
  image: string;
  variant: "sitewalk" | "twin";
  accentVar: "--graphite-primary" | "--twin360-blue";
  label: string;
};

/**
 * Marketing mock phone: a real construction-site photo full-bleed inside the
 * device frame, with the app's capture UI overlaid — so it reads like what a
 * user actually sees walking a site. No notch (clean mock frame).
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
        {/* Full-bleed camera view */}
        <Image src={image} alt={label} fill sizes="300px" className="object-cover" priority />

        {/* Top chrome */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-3 pb-6 pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm">
            <ChevronLeft className="h-4 w-4" />
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 30%, rgba(0,0,0,0.45))` }}
          >
            {isTwin ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {isTwin ? "Capturing clip" : "Site Walk"}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm">
            <Zap className="h-4 w-4" />
          </span>
        </div>

        {/* Center framing guide */}
        {isTwin ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="rounded-2xl border-2 border-white/30 px-10 py-16" />
            <span
              className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: "rgba(220,38,38,0.85)" }}
            >
              ● REC 0:08
            </span>
            <span className="absolute bottom-28 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-sm">
              Move slowly to capture the space
            </span>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            {/* focus reticle */}
            <div className="relative h-20 w-20">
              <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2" style={{ borderColor: accent }} />
              <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2" style={{ borderColor: accent }} />
              <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2" style={{ borderColor: accent }} />
              <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2" style={{ borderColor: accent }} />
            </div>
            <span className="absolute bottom-28 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-sm">
              Tap to drop a pin on the plan
            </span>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-5 pb-5 pt-10">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/40 bg-white/10 text-white/80">
            <Layers className="h-4 w-4" />
          </span>
          {/* Shutter / record */}
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/90">
            <span
              className={isTwin ? "h-6 w-6 rounded-md" : "h-12 w-12 rounded-full"}
              style={{ backgroundColor: isTwin ? "#DC2626" : "white" }}
            />
          </span>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold text-[var(--graphite-canvas)]"
            style={{ backgroundColor: accent }}
          >
            {isTwin ? "3D" : "+"}
          </span>
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
