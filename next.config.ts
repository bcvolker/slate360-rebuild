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
      { source: "/project-hub", destination: "/features/project-hub", permanent: false },
      { source: "/design-studio", destination: "/features/design-studio", permanent: false },
      { source: "/content-studio", destination: "/features/virtual-studio", permanent: false },
      { source: "/slatedrop", destination: "/features/slatedrop", permanent: false },
      { source: "/360-capture", destination: "/features/360-tour-builder", permanent: false },
    ];
  },
};

export default nextConfig;
