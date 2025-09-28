 import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slate360",
  description: "From Design to Reality",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
    <body className="bg-white text-gray-900 overflow-x-hidden md:overflow-hidden">
        <Navbar />
  <main id="scroll-container" className="h-auto md:h-[calc(100vh-5rem)] md:overflow-y-scroll md:snap-y md:snap-mandatory snap-proximity pt-20">{children}</main>
      </body>
    </html>
  );
}
