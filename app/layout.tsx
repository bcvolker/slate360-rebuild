import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { readBrandingCookie } from "@/lib/server/branding";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { ThemeScript } from "@/components/providers/ThemeProvider";
import "./globals.css";

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
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
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
