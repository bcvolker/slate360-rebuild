"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function SnapManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const enableSnap = () => {
      // Only enable snap on the homepage and on desktop screens
      if (pathname === "/" && window.innerWidth >= 1024) {
        document.documentElement.classList.add("snap-mandatory");
      } else {
        document.documentElement.classList.remove("snap-mandatory");
      }
    };

    enableSnap();
    window.addEventListener("resize", enableSnap);

    return () => {
      window.removeEventListener("resize", enableSnap);
      document.documentElement.classList.remove("snap-mandatory");
    };
  }, [pathname]);

  return null;
}
