import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MarketingJsonLd } from "@/app/(public)/_components/marketing-json-ld";
import { HomeNavLight } from "@/app/(public)/_components/home-nav-light";
import { HomeFooterLight } from "@/app/(public)/_components/home-footer-light";
import { MKT_L_PAGE } from "@/app/(public)/_components/marketing-styles-light";
import { assets } from "@/lib/design-system/tokens";

const SITE_URL = "https://www.slate360.ai";
const TITLE = "Slate360 — Reality-capture documentation for the building industry";
const DESCRIPTION =
  "We visit your site, capture it, and deliver an interactive record through your own project portal. Serving the Greater Phoenix area.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Slate360",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: assets.logoAbsolute, alt: "Slate360" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [assets.logoAbsolute],
  },
};

export default async function RootPage() {
  // The native shells tag their user agent (capacitor.config.ts appendUserAgent). A
  // phone running the app must never land on the marketing site: it goes to the app home,
  // and the middleware turns that into the login screen when the session is gone.
  const ua = (await headers()).get("user-agent") ?? "";
  if (ua.includes("Slate360App")) redirect("/app");

  return (
    <>
      <MarketingJsonLd />
      <div className={MKT_L_PAGE}>
        <HomeNavLight />
        {/* Hero, Problem beat, What you get, Client portal, How it works, What makes it
            different, Who it's for, Thermal, Pricing, and the enquiry form land here across
            the remaining build slices — see docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §7. */}
        <main className="pt-[78px]" />
        <HomeFooterLight />
      </div>
    </>
  );
}
