import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";

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
    icon: "/uploads/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-build="2026-02-26-v4-probe" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
        <NuqsAdapter>
          <TooltipProvider>
            {children}
            <Suspense fallback={null}>
              <BuildRuntimeBadge />
            </Suspense>
          </TooltipProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
