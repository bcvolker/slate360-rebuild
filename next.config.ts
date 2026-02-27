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
        // HTML pages only — force CDN + browsers to revalidate on every visit.
        // Static JS/CSS chunks have content-hashed filenames and keep their own
        // immutable cache headers set by Next.js automatically.
        source: "/:path((?!_next/static|_next/image|favicon).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
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
