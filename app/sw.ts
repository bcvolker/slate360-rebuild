/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const KILL_SWITCH_VERSION = "2026-04-26-sw-kill-v2";

const ignoredPrecacheManifest = self.__SW_MANIFEST;
void ignoredPrecacheManifest;

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  return keys.length;
}

async function notifyClients(type: string) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => {
    client.postMessage({ type, version: KILL_SWITCH_VERSION });
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// Emergency kill switch: remove all old Serwist caches and unregister this
// worker. Slate360 must not have an active SW until the mobile refresh/CSS cache
// path is redesigned and tested. No fetch handler is registered on purpose.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const deleted = await clearAllCaches();
      await self.clients.claim();
      await notifyClients("SLATE360_SW_KILL_RELOAD");
      await self.registration.unregister();
      console.info(`[SW] ${KILL_SWITCH_VERSION} unregistered; cleared ${deleted} cache(s).`);
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SLATE360_FORCE_REFRESH") {
    event.waitUntil(
      (async () => {
        await clearAllCaches();
        await notifyClients("SLATE360_SW_KILL_RELOAD");
        await self.registration.unregister();
      })()
    );
  }
});
