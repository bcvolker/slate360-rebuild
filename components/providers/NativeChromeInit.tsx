"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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
 * Style.Dark forces WHITE status bar icons; Style.Light forces dark icons.
 * SW360's light bone background needs dark icons, the legacy dark canvas
 * needs white icons — each compiled native variant's server.url is fixed at
 * build time (capacitor.config.ts), so window.location.hostname reliably
 * identifies which shell is running.
 *
 * Re-applies on every pathname change (not just once at mount) — this was a
 * single mount-only effect before, and Brian reported the icons were STILL
 * invisible on-device after that first attempt. Client-side route changes
 * never remount this top-level provider, so if the very first native-bridge
 * call raced the WKWebView's readiness (a known category of Capacitor
 * plugin-timing issue) it would silently never retry. Re-running it per
 * navigation costs nothing and removes that failure mode regardless of
 * whether it was the actual cause.
 */
export function NativeChromeInit() {
  const pathname = usePathname();

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
        const isSW360 = window.location.hostname === "app.sitewalk360.app";
        await StatusBar.setStyle({ style: isSW360 ? Style.Light : Style.Dark });
      } catch {
        // Non-fatal: web platform or plugin unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return null;
}
