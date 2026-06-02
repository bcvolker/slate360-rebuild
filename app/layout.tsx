import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { PWA_PLACEHOLDER_ICONS } from "@/lib/pwa/icon-assets";
import { readBrandingCookie } from "@/lib/server/branding";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { ThemeScript } from "@/components/providers/ThemeProvider";
import "./globals.css";

// PLACEHOLDER ICON — pending final green/blue brand mark, do not ship to store as-is.
const { icon192, icon512 } = PWA_PLACEHOLDER_ICONS;

// Force dynamic rendering for all routes. Slate360 is a fully authenticated
// SaaS — there is no benefit to static generation, and the Sentry debug-id
// webpack chunk causes a non-deterministic "Cannot read properties of null
// (reading 'useContext')" crash during SSG prerendering.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Slate360 — Field-to-office construction documentation",
  description:
    "Slate360 connects site capture with office review. Site Walk turns contextual field documentation into branded deliverables.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Slate360",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: icon192, sizes: "192x192", type: "image/png" },
      { url: icon512, sizes: "512x512", type: "image/png" },
    ],
    shortcut: icon192,
    apple: [
      { url: icon192, sizes: "192x192", type: "image/png" },
      { url: icon512, sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B0F15",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await readBrandingCookie();

  return (
    <html lang="en" className="scroll-smooth" data-build="pathb-leaflet-01" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="screen-orientation" content="portrait" />
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} antialiased`}
        suppressHydrationWarning
        style={{
          "--brand-primary": branding.primary_color,
          "--brand-accent": branding.accent_color,
          "--brand-font": branding.font_family,
        } as React.CSSProperties}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
