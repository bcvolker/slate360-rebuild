"use client";

import { useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * GetTheAppEnhancer — progressive enhancement for [data-get-the-app] anchors.
 *
 * Captures `beforeinstallprompt` and intercepts the click on any anchor
 * with the `data-get-the-app` attribute to trigger the native install
 * dialog instead of navigating to /install. If no native prompt is
 * available, the anchor's default href navigation runs unchanged.
 *
 * Renders nothing. Idempotent. Safe to mount multiple times — only the
 * latest install event is held.
 */
export function GetTheAppEnhancer() {
  useEffect(() => {
    let installEvent: BeforeInstallPromptEvent | null = null;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      installEvent = e as BeforeInstallPromptEvent;
    };

    const onClick = async (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        "[data-get-the-app]"
      );
      if (!target) return;
      if (!installEvent) return; // let the anchor navigate to /install
      e.preventDefault();
      try {
        await installEvent.prompt();
        await installEvent.userChoice;
        installEvent = null;
      } catch {
        // If prompt fails, navigate to /install fallback
        window.location.href = "/install";
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
