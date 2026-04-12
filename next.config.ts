import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  experimental: {
    // Limits the number of workers to reduce memory consumption
    memoryBasedWorkersCount: true,
  },
  webpack: (config) => {
    // Wagmi connectors import optional peer deps we don't use at runtime.
    // Alias them to false so webpack resolves them to empty modules.
    const stub: Record<string, boolean> = {
      "@react-native-async-storage/async-storage": false,
      "porto": false,
      "porto/internal": false,
      "@walletconnect/ethereum-provider": false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
    };
    config.resolve.alias = { ...config.resolve.alias, ...stub };
    return config;
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/:path((?!_next/static|_next/image|favicon).*)",
        headers: [
          { key: "Cache-Control",           value: "public, max-age=0, must-revalidate" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",         value: "DENY" },
          { key: "X-XSS-Protection",        value: "1; mode=block" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",      value: "camera=(self), microphone=(self), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://ajax.googleapis.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' data: https://*.supabase.co wss://*.supabase.co https://api.resend.com https://*.googleapis.com https://maps.gstatic.com https://www.gstatic.com https://api.openweathermap.org https://api.open-meteo.com https://wttr.in https://nominatim.openstreetmap.org https://*.amazonaws.com https://polygon.drpc.org https://*.drpc.org https://*.ingest.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com",
              "frame-src 'self' blob: https://cdn.pannellum.org/ https://*.amazonaws.com https://slate360-storage.s3.us-east-2.amazonaws.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /360-capture is not a real app route — redirect to its marketing page
      { source: "/360-capture", destination: "/features/360-tour-builder", permanent: false },
      // NOTE: /design-studio, /content-studio, /virtual-studio, /geospatial, /tours
      //       are real dashboard-tab routes under app/(dashboard)/
      //       — do NOT redirect them to /features/*
      // NOTE: /slatedrop is a real app route (app/slatedrop/page.tsx) — do NOT redirect it
      // NOTE: /analytics is now a real dashboard route (app/(dashboard)/analytics/page.tsx) — do NOT redirect it
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (CI/deploy)
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
});
