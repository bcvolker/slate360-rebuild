 import type { Metadata, Viewport } from "next";
import "./globals.css";
import Image from "next/image";
import Navbar from "@/components/ui/Navbar";
import CEOPanelWrapper from "@/components/admin/CEOPanelWrapper";

export const metadata: Metadata = {
  title: "Slate360",
  description: "From Design to Reality",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-end items-center p-4">
          <Image src="/assets/slate360logoforwebsite.png" alt="Slate360 Logo" width={180} height={50} priority className="h-20 w-auto p-2" unoptimized />
        </div>
        <Navbar />
        <main className="pt-16">{children}</main>
        <CEOPanelWrapper />
      </body>
    </html>
  );
}
