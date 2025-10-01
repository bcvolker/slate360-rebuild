 import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import { Inter } from "next/font/google";
import DebugScrollOverlay from "@/components/DebugScrollOverlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slate360",
  description: "From Design to Reality",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.log("✅ Slate360 CLEAN BUILD", new Date().toISOString());
  return (
    <html lang="en">
  <body className={`bg-white text-gray-900 overflow-x-hidden md:overflow-hidden ${inter.className}`}>
    <Navbar />
    <DebugScrollOverlay />
  <main id="scroll-container" className="snap-y snap-mandatory overflow-y-scroll h-screen">{children}</main>
      </body>
    </html>
  );
}
