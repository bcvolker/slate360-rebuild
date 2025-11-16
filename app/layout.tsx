import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import ScrollRail from "@/components/ui/ScrollRail";
import FooterLinks from "../components/FooterLinks";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slate360 - From Design to Reality",
  description: "The all-in-one platform for AEC professionals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Fixed header at the very top */}
        <Navbar />

        {/* Fixed right-side scroll rail (desktop only) */}
        <ScrollRail />

        {/* Scroll container: full viewport height, snaps per tile */}
        <main
          id="scroll-container"
          className="h-screen overflow-y-auto snap-y snap-mandatory pt-20"
        >
          {/* All homepage tiles */}
          {children}

          {/* Footer as final snap tile */}
          <FooterLinks />
        </main>
      </body>
    </html>
  );
}
