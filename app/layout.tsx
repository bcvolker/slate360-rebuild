import type { Metadata, Viewport } from "next";
import "./globals.css";
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
        <Navbar />
        <main className="pt-12">{children}</main>
        <CEOPanelWrapper />
      </body>
    </html>
  );
}
