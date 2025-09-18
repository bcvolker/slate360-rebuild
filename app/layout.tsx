import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "../components/ui/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slate360",
  description: "A modern, animated, snap-scrolling homepage for Slate360.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className + " min-h-screen flex flex-col"}>
        <main className="flex-1 snap-container">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
