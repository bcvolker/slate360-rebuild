import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Slate360 - From Design to Reality",
  description: "The all-in-one platform for AEC professionals.",
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col h-screen bg-slate-900">
          <Navbar />
          <main
            id="scroll-container"
            className="flex-1 overflow-y-auto snap-y snap-proximity md:snap-mandatory"
          >
            <div className="pt-20">{children}</div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
