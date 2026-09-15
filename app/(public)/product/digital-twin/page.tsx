import { redirect } from "next/navigation";

/**
 * Pre-pivot SaaS product page (drone/tripod-LiDAR "survey-grade" claims,
 * credits, self-serve exports) — none of it matches the current capture
 * toolchain (iPhone LiDAR only) or the services-model site. Not linked from
 * any live nav/footer/sitemap; redirect covers any stale bookmark/backlink.
 */
export default function DigitalTwinProductPage() {
  redirect("/");
}
