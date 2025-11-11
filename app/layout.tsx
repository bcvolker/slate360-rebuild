import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import FooterLinks from "../components/FooterLinks";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slate360 - From Design to Reality",
  description: "The all-in-one platform for AEC professionals.",
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-white">
          <Navbar />
          <main className="pt-20">
            {children}
          </main>
          <FooterLinks />
        </div>
      </body>
    </html>
  );
}
