import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/ui/SiteHeader";
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
      <body className="antialiased font-sans text-slate-900 bg-slate-50 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] h-full w-full overflow-hidden relative">
        <SiteHeader />
        <main
          id="main-scroller"
          className="absolute inset-0 w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth snap-y snap-mandatory scroll-pt-20"
        >
          {children}
        </main>
      </body>
    </html>
  );
}