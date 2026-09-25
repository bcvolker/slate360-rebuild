import { notFound } from "next/navigation";

import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";

/**
 * Viewer-fidelity harness: the verified Room 213 Spirula models through the REAL shared splat viewer
 * (SplatViewerCore → SplatViewerScene → SparkRenderer), served by ./asset. The canvas box is a fixed
 * 1280×720 CSS px so screenshots at the same view are comparable; the drawing buffer follows the
 * browser's device-pixel ratio exactly as in the product.
 *
 *   ?model=golden|edge   ?view=carpet_a0_indep|carpet_a3_indep|carpet_a0_fixed   ?provenance=off (before)
 */
const VIEWS = new Set(["carpet_a0_indep", "carpet_a3_indep", "carpet_a0_fixed"]);

export default async function Room213SplatPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const p = await searchParams;
  const one = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : p[k]) as string | undefined;
  const model = one("model") === "edge" ? "edge" : "golden";
  const view = VIEWS.has(one("view") ?? "") ? (one("view") as string) : "carpet_a0_indep";
  const provenance = one("provenance") === "off" ? "off" : "on";
  const src = `/preview/room213-splat/asset?model=${model}&view=${view}&provenance=${provenance}&kind=ply`;

  return (
    <main className="min-h-dvh w-full bg-[var(--graphite-canvas)] p-3" data-app="twin360">
      <div className="relative overflow-hidden border border-white/10" style={{ width: 1280, height: 720 }}>
        <SplatViewerCore src={src} className="h-full w-full" cameraMode="orbit" quiet />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-white/50">
        room 213 · {model} · {view} · provenance {provenance} · visualisation only
      </p>
    </main>
  );
}
