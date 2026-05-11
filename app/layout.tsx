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
    <html lang="en" className="scroll-smooth" data-build="canary-alpha-01" suppressHydrationWarning>
      <head>
        {/* Force iOS Safari to never cache this page */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
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
        {/* CANARY BANNER — remove after confirming deploy cache is busted */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999, background: "#dc2626", color: "#fff", textAlign: "center", padding: "6px 12px", fontSize: "13px", fontWeight: 900, letterSpacing: "0.1em", fontFamily: "monospace" }}>
          VER: CANARY-ALPHA-01 — {new Date().toISOString().slice(0, 10)}
        </div>
        <div style={{ height: "32px" }} />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
