"use client";

import { useEffect } from "react";

export function SWRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const checkAndClearCache = async () => {
        const buildId =
          process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
          process.env.NEXT_PUBLIC_BUILD_ID ??
          "dev-local";
        const lastBuildId = localStorage.getItem("slate360-last-build");

        if (buildId !== lastBuildId) {
          console.log(`[SW] Build ID changed from ${lastBuildId} to ${buildId}. Nuking cache.`);
          
          // 1. Unregister all service workers
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
          
          // 2. Clear all Caches
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map(key => window.caches.delete(key)));
          
          // 3. Update localStorage and reload
          localStorage.setItem("slate360-last-build", buildId);
          window.location.reload();
        } else {
          // Normal SW registration for this build
          const swUrl = `/sw.js?v=${encodeURIComponent(buildId)}`;
          navigator.serviceWorker.register(swUrl, { updateViaCache: "none" }).then((registration) => {
            void registration.update();
          }).catch((err) => {
            console.warn("[SW] registration failed:", err);
          });
        }
      };

      void checkAndClearCache();
    }
  }, []);

  return null;
}
