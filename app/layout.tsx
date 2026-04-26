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
    icon: [
      { url: "/uploads/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/uploads/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-v2.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon-v2.svg",
    apple: [
      { url: "/uploads/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/uploads/icon-512.png", sizes: "512x512", type: "image/png" },
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
    <html lang="en" className="scroll-smooth" data-build="2026-04-23-light-flip-v1" suppressHydrationWarning>
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
