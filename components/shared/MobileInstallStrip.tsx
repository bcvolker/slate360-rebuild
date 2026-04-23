"use client";

/**
 * MobileInstallStrip — visible, redundant Install/Download bar that sits
 * directly under MobileTopBar so the user always has a working entry point
 * even if the icon-only Download button in the topbar is hidden or the
 * native install prompt hasn't fired yet.
 *
 * Behaviour:
 *   - When `beforeinstallprompt` has fired (Android / Chromium): tap = native install dialog.
 *   - On iOS Safari (no event): tap navigates to /install which has full instructions.
 *   - When the app is already running standalone: the strip hides itself.
 *   - Dismissable: stores `slate360.install-strip.dismissed` in localStorage.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";

interface DeferredPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISS_KEY = "slate360.install-strip.dismissed";

export function MobileInstallStrip() {
  const [installEvent, setInstallEvent] = useState<DeferredPrompt | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    setHidden(false);

    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as unknown as DeferredPrompt);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (hidden) return null;

  const onClick = async () => {
    if (installEvent) {
      try {
        await installEvent.prompt();
        await installEvent.userChoice;
      } catch {
        /* ignore */
      }
    } else {
      window.location.href = "/install";
    }
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  return (
    <div className="lg:hidden bg-cobalt/15 border-b border-cobalt/30 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onClick}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cobalt text-primary-foreground text-sm font-semibold hover:bg-cobalt-hover active:scale-[0.98] transition"
        >
          <Download className="h-4 w-4" />
          {installEvent ? "Install Slate360 app" : "Get the Slate360 app"}
        </button>
        {installEvent ? null : (
          <Link
            href="/install"
            className="px-2 py-2 text-xs text-cobalt underline whitespace-nowrap"
          >
            How?
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="p-2 rounded-lg text-slate-400 hover:text-foreground hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
