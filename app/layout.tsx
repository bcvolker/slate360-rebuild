import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import SiteLogo from "@/components/ui/SiteLogo";
import TileNavigation from "@/components/ui/TileNavigation";
import CEOPanelWrapper from "@/components/admin/CEOPanelWrapper";

export const metadata: Metadata = {
  title: "Slate360",
  description: "From Design to Reality",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <SiteLogo />
        <Navbar />
        <TileNavigation />
        <main className="pt-12">{children}</main>
        <CEOPanelWrapper />
      </body>
    </html>
  );
}
