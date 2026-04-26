"use client";

import { useEffect } from "react";

export function SWRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const refreshKey = "slate360-sw-refresh-2026-04-26-stale-css-purge-v1";
      let refreshing = false;

      const handleControllerChange = () => {
        if (refreshing || sessionStorage.getItem(refreshKey) === "done") return;
        refreshing = true;
        sessionStorage.setItem(refreshKey, "done");
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
        void registration.update();
      }).catch((err) => {
        console.warn("[SW] registration failed:", err);
      });

      return () => {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }
  }, []);

  return null;
}
