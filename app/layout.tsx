import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
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
      <body className="bg-slate-950 text-slate-50 antialiased min-h-screen">
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <ScrollRail />
          {process.env.NODE_ENV === "development" && (
            <div className="pointer-events-none fixed inset-x-0 top-1/2 z-[60] border-t border-red-500/40" />
          )}
          <main id="scroll-container" className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}