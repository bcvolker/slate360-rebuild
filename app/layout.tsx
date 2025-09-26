import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import SiteLogo from "@/components/ui/SiteLogo";
import CEOPanelWrapper from "@/components/admin/CEOPanelWrapper";

export const metadata: Metadata = {
  title: "Slate360",
  description: "From Design to Reality",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <SiteLogo />
        <Navbar />
        <main className="pt-12">{children}</main>
        <CEOPanelWrapper />
      </body>
    </html>
  );
}
