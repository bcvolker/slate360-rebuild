import { NextResponse } from "next/server";
import { isSplatLabEnabled } from "@/lib/splat-lab/job-store";
import { ALLOWED_ROOTS, listDirectory, resolveSafePath } from "@/lib/splat-lab/fs-roots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Desktop-only: this walks the local filesystem, so it must never be
// reachable from a non-localhost Host header. The desktop route's own
// layout.tsx already enforces this for pages; this route is only ever
// fetched from those pages, but we re-check the header here too as a
// second, independent layer of defense against SSRF/reverse-proxy tricks.
function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const h = host.split(":")[0];
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

export async function GET(req: Request) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  if (!isLocalHost(req.headers.get("host"))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const requested = url.searchParams.get("path");
  const safePath = resolveSafePath(requested);
  if (!safePath) {
    return NextResponse.json({ error: "path is outside the allowed folders", roots: ALLOWED_ROOTS }, { status: 400 });
  }
  const { entries, parent } = listDirectory(safePath);
  return NextResponse.json({ path: safePath, parent, entries, roots: ALLOWED_ROOTS });
}
