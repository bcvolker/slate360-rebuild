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

      {/* Main Scroll Container lives on the page; body/html handle scrolling */}
      <div id="slate360">
        {siteSections.map((section, index) => (
          <UnifiedSection 
            key={section.id} 
            id={section.id} 
            tile={section} 
            index={index} 
            displayTheme={index % 2 === 0 ? "deep" : "light"}
          />
        ))}
        
        {/* Footer - Inside Snap Flow to be reachable */}
        <Footer />
      </div>
    </>
  );
}