import type { MetadataRoute } from "next";

const SITE_URL = "https://www.slate360.ai";

const PUBLIC_PATHS = [
  "/",
  "/signup",
  "/login",
  "/contact",
  "/privacy",
  "/terms",
  "/product/site-walk",
  "/install",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
