"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Download, Smartphone } from "lucide-react";
import Link from "next/link";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * GetTheAppButton — primary marketing CTA.
 *
 * Behavior:
 * 1. If the browser has fired `beforeinstallprompt` (Android Chrome / Edge
 *    desktop), trigger the native install prompt.
 * 2. If already running standalone (already installed), link to /dashboard.
 * 3. On iOS Safari (no prompt event), open a help modal with Add-to-Home-Screen
 *    instructions.
 * 4. Fallback: link to /signup?next=/app so the user can still progress.
 */
export default function GetTheAppButton({ className = "" }: { className?: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari legacy
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(standalone));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const isIos = typeof window !== "undefined" && /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  if (isStandalone) {
    return (
      <Link
        href="/dashboard"
        className={`btn-amber-soft inline-flex items-center justify-center h-12 px-4 sm:px-6 text-base font-semibold rounded-md ${className}`}
      >
        <span className="truncate">Open Slate360</span>
        <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
      </Link>
    );
  }

  const handleClick = async () => {
    if (installEvent) {
      try {
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
        return;
      } catch {
        // fall through to signup
      }
    }
    if (isIos) {
      setShowIosHelp(true);
      return;
    }
    // Last resort: signup so the flow doesn't dead-end.
    window.location.href = "/signup?next=/app";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`btn-amber-soft inline-flex items-center justify-center h-12 px-4 sm:px-6 text-base font-semibold rounded-md ${className}`}
      >
        <Download className="mr-1.5 h-4 w-4 shrink-0" />
        <span className="truncate">Get the App</span>
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIosHelp(false);
          }}
        >
          <div className="w-full sm:max-w-md rounded-2xl bg-app-card border border-app p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cobalt-soft flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-cobalt" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Install on iPhone</h3>
            </div>
            <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
              <li>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Slate360 will appear on your home screen and open like a native app.
            </p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="w-full h-10 rounded-lg bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
