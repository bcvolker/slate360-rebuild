import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async redirects() {
    return [
      {
        source: "/project-hub",
        destination: "/",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/",
        permanent: false,
      },
      {
        source: "/design-studio",
        destination: "/",
        permanent: false,
      },
      {
        source: "/content-studio",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
