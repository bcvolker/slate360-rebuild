import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEPLOY_MARKER = "deploy-check-2026-02-26-01";

export async function GET() {
  const payload = {
    marker: DEPLOY_MARKER,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    url: process.env.VERCEL_URL ?? null,
    region: process.env.VERCEL_REGION ?? null,
    now: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
