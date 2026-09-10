import { assets } from "@/lib/design-system/tokens";

const SITE_URL = "https://www.slate360.ai";

/**
 * Organization + WebSite only — no SoftwareApplication/app entries and no
 * trial/pricing offers (see docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §4.5,
 * §5). This is a documentation/capture SERVICE, not app-store software.
 */
export function MarketingJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Slate360",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: assets.logoAbsolute,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Slate360",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
