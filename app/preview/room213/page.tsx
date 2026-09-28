import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Room213Experience } from "@/components/room213/Room213Experience";
import { GOLDEN_BYTES, GOLDEN_FILE, goldenTrainingRasterizer } from "@/lib/room213/provenance.server";
import { GOLDEN_SHA256 } from "@/lib/room213/scene-config";

export const dynamic = "force-dynamic";

const TITLE = "Payne Hall — Room 213";
/** Dollhouse render + brand panel (1200×630), shown by iMessage/WhatsApp/Slack link previews. */
const SHARE_IMAGE = {
  url: "/preview/room213/share-dollhouse-v2.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Payne Hall Room 213 — Slate360 interactive 3D room, dollhouse view",
};
const DESCRIPTION = "Interactive 3D room — look around in Dollhouse or Walk, and tap the plaques for photos and drawings.";

function siteOrigin(): URL {
  const host = process.env.ROOM213_SHARE_HOST ?? process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}

/** Server-rendered link-preview metadata (no client JS needed). */
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: siteOrigin(),
    title: { absolute: TITLE },
    description: DESCRIPTION,
    applicationName: "Slate360",
    robots: { index: false, follow: false },
    alternates: { canonical: "/preview/room213" },
    // Explicit, query-free image URL (a new file name so message apps don't reuse a cached preview).
    openGraph: { type: "website", siteName: "Slate360", title: TITLE, description: DESCRIPTION, url: "/preview/room213", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
    // "Add to Home Screen" opens this room full screen (no browser bars) — the only true full screen on iPhone.
    manifest: "/preview/room213/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Room 213" },
  };
}

/**
 * Shareable Room 213 proof of concept (preview deployments only). The small manifest (training provenance) is
 * inlined; the model is one content-hashed, immutable file — from the public media host when configured
 * (ROOM213_MEDIA_BASE), otherwise from this deployment's streaming route. `?internal=1` = diagnostics panel + test hooks; `?probe=1` = test hooks only (clean screenshots).
 * (A local-only fidelity control lives at ./control.)
 */
export default async function Room213Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const p = await searchParams;
  const flag = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : p[k]) === "1";
  const trainingRasterizer = await goldenTrainingRasterizer();
  const base = process.env.ROOM213_MEDIA_BASE?.replace(/\/$/, "");
  // The untouched golden model in every view (Walk must keep every splat — see lib/room213/edit-state.ts).
  const modelUrl = base ? `${base}/room213/${GOLDEN_FILE}` : `/preview/room213/model/${GOLDEN_FILE}`;
  // Probe-only fidelity knob: `?dpr=1.5` pins the pixel ratio (default min(devicePixelRatio, 2)).
  const probeOn = flag("probe") || flag("internal");
  const dprParam = Number(Array.isArray(p.dpr) ? p.dpr[0] : p.dpr);
  const probeDpr = probeOn && dprParam >= 0.5 && dprParam <= 3 ? dprParam : undefined;
  // Probe-only maxPixelRadius sweep (`?probe=1&px=64`): integer 8..2048, anything else ignored.
  const pxRaw = Number(Array.isArray(p.px) ? p.px[0] : p.px);
  const pxParam = probeOn && Number.isInteger(pxRaw) && pxRaw >= 8 && pxRaw <= 2048 ? pxRaw : undefined;
  return (
    <Room213Experience
      modelUrl={modelUrl}
      fallbackUrl={base ? `/preview/room213/model/${GOLDEN_FILE}` : undefined}
      modelBytes={GOLDEN_BYTES}
      manifest={{ version: 1, training_rasterizer: trainingRasterizer ?? undefined }}
      sourceSha={GOLDEN_SHA256}
      internal={flag("internal")}
      probe={probeOn}
      posterMode={flag("poster")}
      probeDpr={probeDpr}
      diag={probeOn ? [...String((Array.isArray(p.diag) ? p.diag[0] : p.diag) ?? "").split(",").filter(Boolean), ...(pxParam ? [`px:${pxParam}`] : [])] : undefined}
    />
  );
}
