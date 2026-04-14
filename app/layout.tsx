import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { readBrandingCookie } from "@/lib/server/branding";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { ThemeScript } from "@/components/providers/ThemeProvider";
import "./globals.css";

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
  title: "Slate360 — The All-In-One Construction Platform",
  description:
    "Slate360 gives construction teams, architects, and project managers a complete platform to manage, visualize, and deliver building projects.",
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
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: [{ url: "/uploads/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#18181b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await readBrandingCookie();

  return (
    <html lang="en" className="scroll-smooth" data-build="2026-02-26-v4-probe" suppressHydrationWarning>
      <head>
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
