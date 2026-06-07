import { assets } from "@/lib/design-system/tokens";
import { SLATE360_APPS } from "@/lib/apps-config";

const SITE_URL = "https://www.slate360.ai";

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
      ...SLATE360_APPS.map((app) => ({
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#${app.slug}`,
        name: app.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "iOS, Android, Web",
        description: app.tagline,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "14-day free trial available",
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
      })),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
