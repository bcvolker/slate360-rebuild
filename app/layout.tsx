import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import Web3Providers from "@/components/Web3Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Slate360 — The All-In-One Construction Platform",
  description:
    "Slate360 gives construction teams, architects, and project managers a complete platform to manage, visualize, and deliver building projects.",
  icons: {
    icon: "/uploads/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-build="2026-02-26-v3">
      <body className={`${geistSans.variable} antialiased`}>
        <Web3Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Web3Providers>
      </body>
    </html>
  );
}
