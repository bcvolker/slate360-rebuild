"use client";

import { useEffect } from "react";

/**
 * iOS native shell chrome. Makes the WKWebView render edge-to-edge (status bar
 * overlays the web view) so fullscreen `fixed inset-0` surfaces — e.g. the camera
 * capture screens — reach the physical top of the device. CSS env(safe-area-inset-*)
 * then keeps headers/controls clear of the notch / Dynamic Island. Without this the
 * web viewport starts below the status bar and `top: 0` is not the physical top,
 * which produced the "capture screen too low / black band above the accent bar" bug.
 *
 * Runtime call complements the capacitor.config StatusBar.overlaysWebView setting —
 * belt-and-suspenders for the remote server.url shell where config alone can be
 * applied inconsistently.
 *
 * Style.Dark forces WHITE status bar icons and previously ran unconditionally,
 * hardcoded for the legacy app's dark #0B0F15 canvas — inside the Site Walk 360
 * shell (light bone #F2EFE9 background) that made the time/battery/wifi icons
 * render white-on-near-white, i.e. invisible (Brian's on-device report). Each
 * compiled native variant's server.url is fixed at build time
 * (capacitor.config.ts), so the hostname reliably tells us which shell is
 * running and which icon color it needs — no shared/ambiguous state.
 */
export function NativeChromeInit() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.getPlatform() !== "ios") return;
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        // overlay=true → web view extends under the status bar (edge-to-edge).
        await StatusBar.setOverlaysWebView({ overlay: true });
        // SW360's light bone background needs dark icons (Style.Light); the
        // legacy dark canvas needs white icons (Style.Dark).
        const isSW360 = window.location.hostname === "app.sitewalk360.app";
        await StatusBar.setStyle({ style: isSW360 ? Style.Light : Style.Dark });
      } catch {
        // Non-fatal: web platform or plugin unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
