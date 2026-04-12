import { NextResponse } from "next/server";

/**
 * GET /.well-known/assetlinks.json
 *
 * Digital Asset Links for Android TWA (Trusted Web Activity).
 * The SHA-256 fingerprint must be updated when the Play Store signing key changes.
 *
 * Placeholder values — replace with real package name and signing certificate
 * before Play Store submission.
 */
export async function GET() {
  const assetLinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: process.env.ANDROID_PACKAGE_NAME ?? "ai.slate360.app",
        sha256_cert_fingerprints: [
          process.env.ANDROID_SHA256_FINGERPRINT ??
            "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00",
        ],
      },
    },
  ];

  return NextResponse.json(assetLinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
