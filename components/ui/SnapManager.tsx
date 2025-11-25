"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function SnapManager() {
  const pathname = usePathname();

  useEffect(() => {
    // Add 'snap-mandatory' class to html tag only on the homepage
    if (pathname === "/") {
      document.documentElement.classList.add("snap-mandatory");
    } else {
      document.documentElement.classList.remove("snap-mandatory");
    }
    
    // Cleanup on unmount (though this component persists in layout)
    return () => {
      document.documentElement.classList.remove("snap-mandatory");
    };
  }, [pathname]);

  return null;
}
