"use client";

import { useMemo } from "react";

type Props = {
  projectId: string;
  projectName: string;
  lat?: number;
  lng?: number;
};

function buildOrbitSrc(lat?: number, lng?: number, name?: string) {
  const base = (process.env.NEXT_PUBLIC_SITEORBIT_URL ?? "").replace(/\/$/, "");
  if (!base) return "";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  const url = new URL("/embed", origin);
  url.searchParams.set("embed", "1");
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    url.searchParams.set("r", "805");
    if (name) url.searchParams.set("name", name);
  }
  return url.toString();
}

export function ProjectOrbitTab({ projectName, lat, lng }: Props) {
  const src = useMemo(() => buildOrbitSrc(lat, lng, projectName), [lat, lng, projectName]);

  if (!src) {
    return (
      <section className="rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] p-5 backdrop-blur-md">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
          SiteOrbit
        </p>
        <h2 className="mt-2 text-xl font-bold text-[var(--graphite-text-header)]">
          Orbit globe is not wired yet
        </h2>
        <p className="mt-2 text-sm text-[var(--graphite-muted)]">
          Set NEXT_PUBLIC_SITEORBIT_URL on this Vercel project to the SiteOrbit origin, then this tab embeds the 3D globe with Slate360 branding.
        </p>
      </section>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)]">
      <iframe
        title={`${projectName} SiteOrbit globe`}
        src={src}
        className="min-h-[70vh] w-full flex-1 border-0 bg-[var(--graphite-canvas)]"
        allow="geolocation; clipboard-write; fullscreen; xr-spatial-tracking"
      />
    </div>
  );
}
