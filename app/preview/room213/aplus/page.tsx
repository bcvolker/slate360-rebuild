import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Room213Experience } from "@/components/room213/Room213Experience";
import { APLUS_BYTES, APLUS_FILE, APLUS_RENDER_PROFILE, APLUS_SHA256, APLUS_TO_GOLDEN_FRAME } from "@/lib/room213/aplus-ref";

export const dynamic = "force-dynamic";

const TITLE = "Payne Hall — Room 213 · A+ MULTI-PASS (temporary)";
const SHARE_IMAGE = { url: "/preview/room213/aplus-share.jpg", width: 1200, height: 630, type: "image/jpeg", alt: "Payne Hall Room 213 — A+ MULTI-PASS model, dollhouse view" };
const DESCRIPTION = "Temporary evaluation viewer — A+ MULTI-PASS model of Room 213 in the same viewer. Look around in Dollhouse or Walk.";

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
    alternates: { canonical: "/preview/room213/aplus" },
    openGraph: { type: "website", siteName: "Slate360", title: TITLE, description: DESCRIPTION, url: "/preview/room213/aplus", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
    manifest: "/preview/room213/aplus.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Room 213 A+" },
  };
}

/**
 * TEMPORARY subjective-evaluation page: the frozen A+ MULTI-PASS model (lib/room213/aplus-ref.ts) in the SAME viewer,
 * controls, cameras and Spark settings as /preview/room213/official. Golden and official pages are unchanged.
 * Posters are rendered from this page by scripts/ops/room213-posters.mjs (route /preview/room213/aplus, prefix aplus-).
 */
export default async function Room213APlusPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const p = await searchParams;
  const flag = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : p[k]) === "1";
  const base = process.env.ROOM213_MEDIA_BASE?.replace(/\/$/, "");
  const modelUrl = base ? `${base}/room213/${APLUS_FILE}` : `/preview/room213/model/${APLUS_FILE}`;
  return (
    <>
      <Room213Experience
        modelUrl={modelUrl}
        fallbackUrl={base ? `/preview/room213/model/${APLUS_FILE}` : undefined}
        modelBytes={APLUS_BYTES}
        manifest={{ version: 1, training_rasterizer: { trainer: "spirula", trainer_revision: "183b2c6", primitive: "3dgs" } }}
        sourceSha={APLUS_SHA256}
        internal={flag("internal")}
        probe={flag("probe") || flag("internal")}
        posterMode={flag("poster")}
        variant={{ profile: APLUS_RENDER_PROFILE, modelTransform: APLUS_TO_GOLDEN_FRAME, poster: { portrait: "/preview/room213/aplus-poster-portrait.jpg", landscape: "/preview/room213/aplus-poster-landscape.jpg" } }}
      />
      {flag("poster") ? null : (
        <div
          className="pointer-events-none fixed left-1/2 top-3 z-[60] -translate-x-1/2 border border-white/10 bg-[var(--graphite-canvas)]/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white backdrop-blur"
          style={{ borderRadius: 12 }}
        >
          A+ MULTI-PASS · temporary
        </div>
      )}
    </>
  );
}
