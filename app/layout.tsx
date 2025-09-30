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
  return (
    <html lang="en">
  <body className={`bg-white text-gray-900 overflow-x-hidden md:overflow-hidden ${inter.className}`}>
    <Navbar />
    <DebugScrollOverlay />
  <main id="scroll-container" className="h-auto md:h-[calc(100vh-5rem)] overflow-visible md:overflow-y-scroll pt-20 bg-white md:overscroll-contain touch-pan-y">{children}</main>
      </body>
    </html>
  );
}
