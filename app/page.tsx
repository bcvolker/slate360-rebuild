import React from "react";
import DesktopHome from "@/components/home/DesktopHome";

export default function HomePage() {
  return (
    <>
      {process.env.NEXT_PUBLIC_DEBUG_ALIGN === "true" && (
        <div
          className="debug-horizontal-line"
          style={{ "--debug-line-y": "120px" } as React.CSSProperties}
        />
      )}
      
      {/* Unified Home Component for all devices */}
      <DesktopHome />
    </>
  );
}