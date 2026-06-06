"use client";

import { IconMapPin } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinGpsMetadata } from "@/lib/digital-twin/viewer-types";

type Props = {
  gps: TwinGpsMetadata | null;
};

function formatCoord(value: number, decimals = 6): string {
  return value.toFixed(decimals);
}

export function TwinGpsDisplay({ gps }: Props) {
  if (!gps) return null;

  const mapsUrl = `https://www.google.com/maps?q=${gps.lat},${gps.lng}`;

  return (
    <section className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-start gap-2">
        <IconMapPin className={cn("mt-0.5 size-4 shrink-0", twinAccent.text)} stroke={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-200">Capture location</p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
            {formatCoord(gps.lat)}, {formatCoord(gps.lng)}
            {typeof gps.alt === "number" ? ` · ${formatCoord(gps.alt, 1)} m alt` : ""}
          </p>
          {typeof gps.accuracy === "number" ? (
            <p className="mt-0.5 text-[10px] text-zinc-500">
              Accuracy ±{formatCoord(gps.accuracy, 1)} m
            </p>
          ) : null}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("mt-1.5 inline-flex items-center gap-1 text-[11px]", twinAccent.link)}
          >
            <IconMapPin className="size-3" stroke={1.75} aria-hidden />
            Open in Google Maps
          </a>
        </div>
      </div>
    </section>
  );
}
