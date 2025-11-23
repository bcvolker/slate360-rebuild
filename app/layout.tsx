import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/ui/SiteHeader";
import { DEFAULT_THEME } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Slate360 – From Design to Reality",
  description: "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools for the built environment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME}>
      <body className="antialiased">
        <SiteHeader />
        <main className="snap-scroll-section">
          {children}
        </main>
      </body>
    </html>
  );
}