import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Slate360",
  description: "From Design to Reality",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <Navbar />
        <main id="scroll-container" className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory">
          {children}
        </main>
      </body>
    </html>
  );
}
