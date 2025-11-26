import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/ui/SiteHeader";
import { DEFAULT_THEME } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "Slate360 – The Operating System for the Built Environment",
  description: "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools for the built environment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} className={`${inter.variable} ${orbitron.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
      </head>
      <body className="antialiased font-sans text-[color:var(--slate-text-main)] overflow-hidden">
        <div className="h-screen flex flex-col">
          <SiteHeader />
          <main className="h-screen w-full overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory relative">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}