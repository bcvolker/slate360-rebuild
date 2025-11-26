import React from "react";
import UnifiedSection from "@/components/home/UnifiedSection";
import { siteSections } from "@/lib/config";
import Footer from "@/components/ui/Footer";
import SideNav from "@/components/ui/SideNav";

export default function HomePage() {
  return (
    <>
      {process.env.NEXT_PUBLIC_DEBUG_ALIGN === "true" && (
        <div
          className="debug-horizontal-line"
          style={{ "--debug-line-y": "120px" } as React.CSSProperties}
        />
      )}
      
      <SideNav />

      {/* Main Scroll Container - Handles Snap */}
      <main className="w-full pt-20">
        {siteSections.map((section, index) => (
          <UnifiedSection key={section.id} tile={section} index={index} />
        ))}
      </main>
      
      {/* Footer - Outside Snap Flow */}
      <Footer />
    </>
  );
}