import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Room213Experience } from "@/components/room213/Room213Experience";
import { GOLDEN_BYTES, GOLDEN_FILE, goldenTrainingRasterizer } from "@/lib/room213/provenance.server";
import { GOLDEN_SHA256 } from "@/lib/room213/scene-config";

export const dynamic = "force-dynamic";

const TITLE = "Payne Hall — Room 213";
const DESCRIPTION = "Interactive Spatial Capture";

function siteOrigin(): URL {
  const host = process.env.ROOM213_SHARE_HOST ?? process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}

/** Server-rendered link-preview metadata (no client JS needed); the OG image is the co-located opengraph-image.jpg. */
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: siteOrigin(),
    title: { absolute: TITLE },
    description: DESCRIPTION,
    applicationName: "Slate360",
    robots: { index: false, follow: false },
    alternates: { canonical: "/preview/room213" },
    openGraph: { type: "website", siteName: "Slate360", title: TITLE, description: DESCRIPTION, url: "/preview/room213" },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  };
}

/**
 * Shareable Room 213 proof of concept (preview deployments only). The small manifest (training provenance) is
 * inlined; the model is one content-hashed, immutable file — from the public media host when configured
 * (ROOM213_MEDIA_BASE), otherwise from this deployment's streaming route. `?internal=1` = diagnostics panel + test hooks; `?probe=1` = test hooks only (clean screenshots).
 */
export default async function Room213Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const p = await searchParams;
  const flag = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : p[k]) === "1";
  const trainingRasterizer = await goldenTrainingRasterizer();
  const base = process.env.ROOM213_MEDIA_BASE?.replace(/\/$/, "");
  const modelUrl = base ? `${base}/room213/${GOLDEN_FILE}` : `/preview/room213/model/${GOLDEN_FILE}`;
  return (
    <Room213Experience
      modelUrl={modelUrl}
      modelBytes={GOLDEN_BYTES}
      manifest={{ version: 1, training_rasterizer: trainingRasterizer ?? undefined }}
      sourceSha={GOLDEN_SHA256}
      internal={flag("internal")}
      probe={flag("probe") || flag("internal")}
      posterMode={flag("poster")}
    />
  );
}
