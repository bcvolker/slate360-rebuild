import { notFound } from "next/navigation";
import { GoldenControl } from "@/components/room213/GoldenControl";
import { GOLDEN_FILE } from "@/lib/room213/provenance.server";

export const dynamic = "force-dynamic";

/**
 * Fidelity control (LOCAL DEVELOPMENT ONLY — 404 on Vercel): the exact golden PLY through the minimum Spark stack
 * (verified profile, fixed camera, no crop/edits/pins/UI/adaptive DPR). The ceiling the full viewer is judged by.
 */
export default async function ControlPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") notFound();
  const p = await searchParams;
  const dpr = p.dpr ? Number(p.dpr) : undefined;
  return <GoldenControl modelUrl={`/preview/room213/model/${GOLDEN_FILE}`} dpr={dpr} />;
}
