"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    // Reset scroll position of the main container on route change
    const container = document.getElementById("scroll-container");
    if (container) {
      container.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
