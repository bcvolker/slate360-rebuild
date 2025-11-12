import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slate360 – From Design to Reality",
  description: "The all-in-one platform for AEC professionals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        <Navbar />
        <main id="main" className="pt-20 h-full">
          {children}
        </main>
      </body>
    </html>
  );
}