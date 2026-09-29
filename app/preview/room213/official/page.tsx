import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Room213Experience } from "@/components/room213/Room213Experience";
import { OFFICIAL_BYTES, OFFICIAL_FILE, OFFICIAL_RENDER_PROFILE, OFFICIAL_SHA256, OFFICIAL_TO_GOLDEN_FRAME } from "@/lib/room213/official-ref";

export const dynamic = "force-dynamic";

const TITLE = "Payne Hall — Room 213 · NEW (official reference)";
const SHARE_IMAGE = {
  url: "/preview/room213/official-share.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Payne Hall Room 213 — NEW official-reference model, dollhouse view",
};
const DESCRIPTION = "A/B test — NEW (official reference) model of Room 213 in the same viewer. Look around in Dollhouse or Walk.";

function siteOrigin(): URL {
  const host = process.env.ROOM213_SHARE_HOST ?? process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: siteOrigin(),
    title: { absolute: TITLE },
    description: DESCRIPTION,
    applicationName: "Slate360",
    robots: { index: false, follow: false },
    alternates: { canonical: "/preview/room213/official" },
    openGraph: { type: "website", siteName: "Slate360", title: TITLE, description: DESCRIPTION, url: "/preview/room213/official", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
    manifest: "/preview/room213/official.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Room 213 NEW" },
  };
}

/**
 * A/B viewing test: the frozen OFFICIAL Spirula Studio reference model (lib/room213/official-ref.ts) in the SAME
 * viewer, controls, cameras, crops and Spark settings as the golden page (/preview/room213, unchanged). The PLY is
 * served as trained from the public media host (content-hashed), else from this deployment's streaming route.
 * `?internal=1` / `?probe=1` behave as on the golden page.
 */
export default async function Room213OfficialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const p = await searchParams;
  const flag = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : p[k]) === "1";
  const base = process.env.ROOM213_MEDIA_BASE?.replace(/\/$/, "");
  const modelUrl = base ? `${base}/room213/${OFFICIAL_FILE}` : `/preview/room213/model/${OFFICIAL_FILE}`;
  const probeOn = flag("probe") || flag("internal");
  return (
    <Room213Experience
      modelUrl={modelUrl}
      fallbackUrl={base ? `/preview/room213/model/${OFFICIAL_FILE}` : undefined}
      modelBytes={OFFICIAL_BYTES}
      manifest={{ version: 1, training_rasterizer: { trainer: "spirula", trainer_revision: "183b2c6", primitive: "3dgs" } }}
      sourceSha={OFFICIAL_SHA256}
      internal={flag("internal")}
      probe={probeOn}
      posterMode={flag("poster")}
      variant={{
        profile: OFFICIAL_RENDER_PROFILE,
        modelTransform: OFFICIAL_TO_GOLDEN_FRAME,
        poster: { portrait: "/preview/room213/official-poster-portrait.jpg", landscape: "/preview/room213/official-poster-landscape.jpg" },
      }}
    />
  );
}
