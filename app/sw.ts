/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Bump this whenever shipping a fix that users on stale caches need to see.
const CACHE_VERSION = "2026-04-22-mobile-fix-v1";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// On every activation, blow away ALL old caches so users on a stale SW
// get fresh HTML/CSS/JS the next time they open the app.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.includes(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Allow the page to force-unregister/refresh from a future debug surface.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SLATE360_FORCE_REFRESH") {
    self.registration.unregister().then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "SLATE360_RELOAD" }));
      });
    });
  }
});

serwist.addEventListeners();
