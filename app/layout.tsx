import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/ui/SiteHeader";
import SnapManager from "@/components/ui/SnapManager";
import { DEFAULT_THEME } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "Slate360 – From Design to Reality",
  description: "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools for the built environment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} className={`${inter.variable} ${orbitron.variable}`}>
      <body className="antialiased font-sans text-slate-900 bg-graphite-theme">
        <SnapManager />
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}