import { NextResponse } from "next/server";

/**
 * GET /.well-known/apple-app-site-association
 *
 * Apple App Site Association for Universal Links.
 * The appID format is: <TeamID>.<BundleID>
 *
 * Placeholder values — replace with real Team ID and Bundle ID
 * before App Store submission.
 */
export async function GET() {
  const appId =
    process.env.APPLE_APP_ID ?? "XXXXXXXXXX.ai.slate360.app";

  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          paths: ["/dashboard/*", "/site-walk/*", "/slatedrop/*", "/share/*"],
        },
      ],
    },
    webcredentials: {
      apps: [appId],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
