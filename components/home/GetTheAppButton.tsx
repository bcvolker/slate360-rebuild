"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Download, Smartphone } from "lucide-react";
import Link from "next/link";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * GetTheAppButton — primary marketing CTA. NEVER does nothing on click.
 *
 * Order of behavior:
 * 1. If already running standalone → "Open Slate360" link to /dashboard.
 * 2. If browser fires `beforeinstallprompt` (Android Chrome / desktop Edge/Chrome)
 *    → trigger the native install prompt on click.
 * 3. Otherwise (iOS Safari, Firefox, in-app browsers) → show an install-help
 *    modal with platform-appropriate Add-to-Home-Screen instructions.
 */
export default function GetTheAppButton({ className = "" }: { className?: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPlatform(detectPlatform());

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(standalone));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

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

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (installEvent) {
      e.preventDefault();
      try {
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
        return;
      } catch {
        // fall through to navigate to /install
        window.location.href = "/install";
      }
      return;
    }
    // No native prompt — let the anchor navigate to /install (works even if
    // JS state machine fails or service worker serves stale chunks).
  };

  return (
    <>
      <a
        href="/install"
        onClick={handleClick}
        className={`btn-amber-soft inline-flex items-center justify-center h-12 px-4 sm:px-6 text-base font-semibold rounded-md ${className}`}
      >
        <Download className="mr-1.5 h-4 w-4 shrink-0" />
        <span className="truncate">Get the App</span>
      </a>

      {showHelp && (
        <InstallHelpModal platform={platform} onClose={() => setShowHelp(false)} />
      )}
    </>
  );
}

function InstallHelpModal({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const steps = INSTALL_STEPS[platform];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md rounded-2xl bg-app-card border border-app p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-cobalt-soft flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-cobalt" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{steps.title}</h3>
        </div>

        <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
          {steps.steps.map((step, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">{steps.note}</p>

        <div className="space-y-2 pt-1">
          <Link
            href="/signup?next=/dashboard"
            onClick={onClose}
            className="block w-full text-center h-10 leading-10 rounded-lg bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover"
          >
            Continue in browser
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-lg border border-app text-foreground text-sm font-medium hover:border-cobalt/40"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

const INSTALL_STEPS: Record<Platform, { title: string; steps: string[]; note: string }> = {
  ios: {
    title: "Install on iPhone / iPad",
    steps: [
      "Open this page in <strong>Safari</strong> (not Chrome or Firefox).",
      "Tap the <strong>Share</strong> icon at the bottom of the screen.",
      "Scroll down and tap <strong>Add to Home Screen</strong>.",
      "Tap <strong>Add</strong> in the top-right corner.",
    ],
    note: "Slate360 will appear on your home screen and open like a native app — no App Store needed during beta.",
  },
  android: {
    title: "Install on Android",
    steps: [
      "Open this page in <strong>Chrome</strong>.",
      "Tap the <strong>⋮</strong> menu (top-right).",
      "Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.",
      "Confirm by tapping <strong>Install</strong>.",
    ],
    note: "Slate360 installs directly from your browser — no Play Store needed during beta.",
  },
  desktop: {
    title: "Install on desktop",
    steps: [
      "Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.",
      "Look for the <strong>Install</strong> icon in the address bar (right side).",
      "Click <strong>Install Slate360</strong>.",
    ],
    note: "Slate360 will open in its own window and run like a native desktop app.",
  },
};
