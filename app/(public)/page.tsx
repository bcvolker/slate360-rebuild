import type { Metadata } from "next";
import { MarketingJsonLd } from "@/app/(public)/_components/marketing-json-ld";
import { MarketingPage } from "@/app/(public)/_components/marketing-page";
import { assets } from "@/lib/design-system/tokens";

const SITE_URL = "https://www.slate360.ai";
const TITLE = "Slate360 — One platform. Two powerful apps.";
const DESCRIPTION =
  "Site Walk for field documentation and project management. Twin 360 for 3D reality capture, inspection, and digital twins. Subscribe on slate360.ai.";

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

export default function RootPage() {
  return (
    <>
      <MarketingJsonLd />
      <MarketingPage />
    </>
  );
}
