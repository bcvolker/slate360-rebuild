import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
