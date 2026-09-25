import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Room213Viewer } from "./Room213Viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Room 213 — Slate360",
  robots: { index: false, follow: false },
};

/**
 * Shareable Room 213 review link (preview deployments only). Default model: golden 1M Spirula 3dgut.
 * Internal-only switches (no UI): ?model=edge (edge-aware comparison), ?internal=1 (live renderer readout),
 * ?dollhouse=full (exterior view without the dollhouse crop).
 */
export default async function Room213Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const p = await searchParams;
  const one = (k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : p[k]) as string | undefined;
  const model = one("model") === "edge" ? "edge" : "golden";
  const full = (one("dollhouse") === "full" ? "&dollhouse=full" : "");
  return <Room213Viewer src={`/preview/room213/asset?model=${model}${full}&kind=ply`} internal={one("internal") === "1"} />;
}
