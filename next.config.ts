import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
