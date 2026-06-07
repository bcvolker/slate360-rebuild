import type { MetadataRoute } from "next";

const SITE_URL = "https://www.slate360.ai";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dev/", "/deploy-check/", "/super-admin/", "/operations-console/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
