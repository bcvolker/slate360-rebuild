/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Bump this whenever shipping a fix that users on stale caches need to see.
const CACHE_VERSION = "2026-04-26-stale-css-purge-v1";

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: /.*/i,
    method: "GET",
    handler: new NetworkOnly(),
  },
];

const ignoredPrecacheManifest = self.__SW_MANIFEST;
void ignoredPrecacheManifest;

const serwist = new Serwist({
  // Do not precache Next HTML/CSS/JS. A stale precached HTML document can point
  // mobile browsers at retired CSS chunks after a deploy, producing an
  // unstyled white/text-only page. Let Vercel/browser immutable asset caching
  // handle _next/static and keep the SW as a purge/update shim for now.
  precacheEntries: [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

// On every activation, blow away all Cache Storage entries from previous SWs so
// users on stale mobile caches get fresh HTML/CSS/JS the next time they open or
// refresh the app.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.navigationPreload?.enable();
      console.info(`[SW] activated ${CACHE_VERSION}; cleared ${keys.length} cache(s).`);
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
