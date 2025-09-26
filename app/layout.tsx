import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import SiteLogo from "@/components/ui/SiteLogo";
import CEOPanel from "@/components/admin/CEOPanel";

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
        <main className="pt-20">{children}</main>
        <CEOPanel />
      </body>
    </html>
  );
}
