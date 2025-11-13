import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Slate360 – From Design to Reality",
  description: "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools for the built environment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Full-page flex column so header + main + footer stack correctly */}
        <div className="flex min-h-screen flex-col">
          {/* Fixed header at top */}
          <Navbar />

          {/* Scrollable content area with top padding equal to header height */}
          <main
            id="scroll-container"
            className="flex-1 pt-20 snap-y snap-mandatory scroll-smooth"
          >
            {children}
          </main>

          {/* Global footer at very bottom */}
          <Footer />
        </div>
      </body>
    </html>
  );
}