import { notFound } from "next/navigation";

import { SplatViewerCore } from "@/components/digital-twin/splat-viewer-core";

/** Colour-fidelity regression fixture through the real shared viewer (see ./asset). ?provenance=off → default profile. */
export default async function SparkFidelityFixturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const p = await searchParams;
  const provenance = (Array.isArray(p.provenance) ? p.provenance[0] : p.provenance) === "off" ? "off" : "on";
  return (
    <main className="bg-black" style={{ width: 640, height: 360 }}>
      <SplatViewerCore
        src={`/preview/spark-fidelity-fixture/asset?provenance=${provenance}&kind=ply`}
        className="h-full w-full"
        cameraMode="orbit"
        quiet
      />
    </main>
  );
}
