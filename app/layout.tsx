import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import ScrollRail from "@/components/ui/ScrollRail";

export const metadata: Metadata = {
  title: "Slate360 – From Design to Reality",
  description:
    "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools for the built environment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50 antialiased">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          {/* Right-side scroll rail for desktop */}
          <ScrollRail />
          <main
            id="scroll-container"
            className="flex-1 h-screen overflow-y-auto pt-20 snap-y snap-proximity"
          >
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}