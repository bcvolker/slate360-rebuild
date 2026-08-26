import { notFound } from "next/navigation";

import SplatViewer from "@/components/digital-twin/SplatViewer";

/**
 * Preview harness for the Gaussian splat — the CLIENT-facing half of a capture.
 *
 * The mesh at /preview/twin-mesh stays the measurement document: floor plan,
 * dollhouse, take-off, "laser governs". This is the one a contractor walks
 * through. Splitting them is the conclusion three review panels reached
 * independently, and the reason is structural rather than cosmetic: a textured
 * mesh must project every photograph onto a surface carrying 27 mm of error,
 * so detail finer than that error cannot survive. A splat has no such surface.
 *
 * Not measurable. Splats have no crisp geometry, so nothing here may be used
 * for dimensions — that is what the mesh is for.
 */
const DEFAULT_LABEL = "kitchen-aug25-splat";
const LABEL_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export default async function TwinSplatPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.label;
  const requested = (Array.isArray(raw) ? raw[0] : raw) || DEFAULT_LABEL;
  if (!LABEL_RE.test(requested)) notFound();

  const src = `/preview/twin-mesh/asset?label=${encodeURIComponent(requested)}&kind=spz`;

  return (
    <main className="h-dvh w-full bg-[var(--graphite-canvas)] p-3" data-app="twin360">
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10">
        <SplatViewer src={src} className="h-full w-full" />
        <p className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] uppercase tracking-wide text-white/50">
          {requested} · visualisation only · not for measurement
        </p>
      </div>
    </main>
  );
}
