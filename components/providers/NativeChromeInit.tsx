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
        // Style.Dark = light text/icons, correct for the dark #0B0F15 background.
        await StatusBar.setStyle({ style: Style.Dark });
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
