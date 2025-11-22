import React from "react";
import DesktopHome from "@/components/home/DesktopHome";
import MobileHome from "@/components/home/MobileHome";

export default function HomePage() {
  return (
    <>
      {process.env.NEXT_PUBLIC_DEBUG_ALIGN === "true" && (
        <div
          className="debug-horizontal-line"
          style={{ "--debug-line-y": "120px" } as React.CSSProperties}
        />
      )}
      {/* Desktop & tablets */}
      <div className="hidden md:block">
        <DesktopHome />
      </div>

      {/* Mobile phones */}
      <div className="block md:hidden">
        <MobileHome />
      </div>
    </>
  );
}