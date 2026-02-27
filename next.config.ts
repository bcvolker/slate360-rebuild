import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
          { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://maps.googleapis.com https://api.openweathermap.org https://wttr.in https://nominatim.openstreetmap.org",
              "frame-src 'none'",
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
      // Legacy URL aliases → correct feature pages
      { source: "/design-studio", destination: "/features/design-studio", permanent: false },
      { source: "/content-studio", destination: "/features/content-studio", permanent: false },
      { source: "/virtual-studio", destination: "/features/virtual-studio", permanent: false },
      // NOTE: /slatedrop is a real app route (app/slatedrop/page.tsx) — do NOT redirect it
      // NOTE: /analytics is now a real dashboard route (app/(dashboard)/analytics/page.tsx) — do NOT redirect it
      { source: "/360-capture", destination: "/features/360-tour-builder", permanent: false },
      { source: "/geospatial", destination: "/features/geospatial-robotics", permanent: false },
    ];
  },
};

export default nextConfig;
