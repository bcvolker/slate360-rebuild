"use client";

import { useEffect } from "react";

export function SWRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const disabledKey = "slate360-sw-disabled-2026-04-26-sw-kill-v2";
      const refreshKey = "slate360-sw-refresh-2026-04-26-sw-kill-v2";
      let refreshing = false;

      const clearBrowserCaches = async () => {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      };

      const unregisterAll = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        await clearBrowserCaches();
        localStorage.setItem(disabledKey, "done");
      };

      const handleControllerChange = () => {
        if (refreshing || sessionStorage.getItem(refreshKey) === "done") return;
        refreshing = true;
        sessionStorage.setItem(refreshKey, "done");
        window.location.reload();
      };

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type !== "SLATE360_SW_KILL_RELOAD") return;
        localStorage.setItem(disabledKey, "done");
        handleControllerChange();
      };

      if (localStorage.getItem(disabledKey) === "done") {
        void unregisterAll().catch((err) => {
          console.warn("[SW] cleanup failed:", err);
        });
        return;
      }

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.addEventListener("message", handleMessage);
      // Cache-bust: iOS standalone PWA aggressively caches SW files independently
      // of Cache Storage. The query param forces iOS to fetch the new SW on every deploy.
      const swUrl = `/sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_BUILD_ID || Date.now().toString(36))}`;
      navigator.serviceWorker.register(swUrl, { updateViaCache: "none" }).then((registration) => {
        void registration.update();
      }).catch((err) => {
        console.warn("[SW] registration failed:", err);
      });

      return () => {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      };
    }
  }, []);

  return null;
}
