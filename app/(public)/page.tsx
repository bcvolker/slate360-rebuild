import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MarketingJsonLd } from "@/app/(public)/_components/marketing-json-ld";
import { HomeNavLight } from "@/app/(public)/_components/home-nav-light";
import { HomeFooterLight } from "@/app/(public)/_components/home-footer-light";
import { HomeHeroLight } from "@/app/(public)/_components/home-hero-light";
import { HomeExampleViewer } from "@/app/(public)/_components/home-example-viewer";
import { HomePackageLight } from "@/app/(public)/_components/home-package-light";
import { HomePortalLight } from "@/app/(public)/_components/home-portal-light";
import { HomeHowItWorksLight } from "@/app/(public)/_components/home-how-it-works-light";
import { HomeWhoPricingLight } from "@/app/(public)/_components/home-who-pricing-light";
import { HomeContactForm } from "@/app/(public)/_components/home-contact-form";
import { MKT_L_CONTAINER, MKT_L_PAGE } from "@/app/(public)/_components/marketing-styles-light";

const SITE_URL = "https://www.slate360.ai";
const TITLE = "Slate360 — Field documentation and workflow for contractors";
const DESCRIPTION =
  "Interactive site walkthroughs, aerial photo and video, 3D models, and a client portal for contractors. Serving the greater Phoenix area.";
const OG_IMAGE = "/uploads/icon-512.png";

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
    images: [{ url: OG_IMAGE, alt: "Slate360" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
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
        <main className="pt-[78px]">
          <HomeHeroLight />
          <section className="pb-8 sm:pb-10">
            <div className={MKT_L_CONTAINER}>
              <HomeExampleViewer />
            </div>
          </section>
          <HomePackageLight />
          <HomePortalLight />
          <HomeHowItWorksLight />
          <HomeWhoPricingLight />
          <HomeContactForm />
        </main>
        <HomeFooterLight />
      </div>
    </>
  );
}
