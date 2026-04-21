"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, ArrowDown, AlertTriangle } from "lucide-react";
import { usePlatform } from "./usePlatform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * InstallClient — adaptive PWA install flow.
 *
 * Strategy ranked by how much the user has to do:
 *   - Already installed       → success card, exit
 *   - Android Chrome          → ONE TAP install via beforeinstallprompt
 *   - In-app browser (IG/FB)  → "Open in Safari/Chrome" + Copy Link
 *   - iOS Safari              → Bottom-sheet coach mark with bouncing arrow
 *                                pointing at the Safari Share toolbar
 *   - iOS non-Safari (Chrome) → "You must use Safari" + Copy Link
 *   - Desktop                 → Address-bar install instructions
 */
export default function InstallClient() {
  const { platform, inAppBrowser } = usePlatform();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<"accepted" | "dismissed" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function triggerInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setInstallResult(choice.outcome);
      if (choice.outcome === "accepted") setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked — silent fail */
    }
  }

  if (platform === null) {
    return <div className="h-40 rounded-2xl bg-app-card border border-app animate-pulse" />;
  }

  if (platform === "standalone") return <AlreadyInstalled />;

  if (platform === "ios-inapp") {
    return <OpenInRealBrowser browser={inAppBrowser ?? "this app"} target="Safari" copied={copied} onCopy={copyLink} />;
  }

  if (platform === "ios-other") {
    return <OpenInRealBrowser browser="Chrome on iPhone" target="Safari" copied={copied} onCopy={copyLink} />;
  }

  if (platform === "ios-safari") return <IOSCoachMark />;

  if (platform === "android-chrome") {
    return (
      <AndroidOneTap
        canPrompt={!!deferredPrompt}
        installing={installing}
        installResult={installResult}
        onInstall={triggerInstall}
      />
    );
  }

  if (platform === "android-other") {
    return <OpenInRealBrowser browser="this browser" target="Chrome" copied={copied} onCopy={copyLink} />;
  }

  return <DesktopInstructions />;
}

// ── States ─────────────────────────────────────────────────────────────

function AlreadyInstalled() {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
      <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
      <h2 className="text-xl font-bold text-emerald-300">Slate360 is installed</h2>
      <p className="text-sm text-emerald-200/80">
        You&rsquo;re running Slate360 as an installed app. You can close this page.
      </p>
    </div>
  );
}

function OpenInRealBrowser({
  browser,
  target,
  copied,
  onCopy,
}: {
  browser: string;
  target: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-7 w-7 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2 flex-1 min-w-0">
          <h2 className="text-lg font-bold text-amber-200">Open this in {target}</h2>
          <p className="text-sm text-amber-100/90 leading-relaxed">
            Apple/Google won&rsquo;t let <strong>{browser}</strong> install apps. Tap the
            button below to copy the Slate360 link, then paste it into <strong>{target}</strong>.
          </p>
        </div>
      </div>

      <button
        onClick={onCopy}
        className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl bg-cobalt text-white text-base font-bold hover:bg-cobalt-hover transition-colors"
      >
        {copied ? (
          <>
            <CheckCircle2 className="h-5 w-5" /> Link copied — open {target} now
          </>
        ) : (
          <>
            <Copy className="h-5 w-5" /> Copy link to open in {target}
          </>
        )}
      </button>

      <p className="text-xs text-amber-100/70 leading-relaxed">
        After you tap Copy: open <strong>{target}</strong> on your phone, tap and hold
        the address bar, paste, then return to this page.
      </p>
    </div>
  );
}

function IOSCoachMark() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cobalt/10 border border-cobalt/30 p-5 text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">2 taps to install</h2>
        <p className="text-sm text-muted-foreground">
          Apple requires you to use Safari&rsquo;s Share menu — that&rsquo;s the only way
          on iPhone.
        </p>
      </div>

      {/* Step 1 — match the actual Apple Share icon */}
      <div className="flex items-center gap-4 rounded-2xl bg-app-card border border-app p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-md">
          <AppleShareIcon className="h-8 w-8 text-cobalt" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground leading-tight">
            1. Tap the Share icon
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Look at the very <strong>bottom</strong> of your screen. Square with an
            up-arrow.
          </p>
        </div>
      </div>

      {/* Step 2 — match the Add to Home Screen icon */}
      <div className="flex items-center gap-4 rounded-2xl bg-app-card border border-app p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-md">
          <AddToHomeIcon className="h-8 w-8 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground leading-tight">
            2. Tap &ldquo;Add to Home Screen&rdquo;
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Scroll the share panel down — it&rsquo;s a square with a plus inside it.
          </p>
        </div>
      </div>

      {/* Bouncing arrow pointing down at the Safari toolbar */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="text-sm font-semibold text-cobalt">The Share button is down here ↓</p>
        <div className="animate-bounce">
          <ArrowDown className="h-12 w-12 text-cobalt drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

function AndroidOneTap({
  canPrompt,
  installing,
  installResult,
  onInstall,
}: {
  canPrompt: boolean;
  installing: boolean;
  installResult: "accepted" | "dismissed" | null;
  onInstall: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cobalt/10 border border-cobalt/30 p-5 space-y-4">
        <h2 className="text-xl font-bold text-foreground text-center">One tap to install</h2>
        {canPrompt ? (
          <button
            onClick={onInstall}
            disabled={installing}
            className="w-full inline-flex items-center justify-center gap-2 h-16 rounded-xl bg-cobalt text-white text-lg font-bold hover:bg-cobalt-hover disabled:opacity-50 shadow-lg shadow-cobalt/30"
          >
            <Download className="h-6 w-6" />
            {installing ? "Installing…" : "Install Slate360"}
          </button>
        ) : (
          <div className="space-y-3 text-sm text-foreground/90">
            <p>
              Your browser didn&rsquo;t offer a one-tap button. Tap the <strong>⋮</strong>{" "}
              menu (top-right of Chrome) → <strong>Install app</strong>.
            </p>
          </div>
        )}
        {installResult === "dismissed" && (
          <p className="text-xs text-amber-300 text-center">
            You dismissed the prompt. Refresh this page to try again.
          </p>
        )}
        {installResult === "accepted" && (
          <p className="text-xs text-emerald-300 text-center">Installing — check your home screen.</p>
        )}
      </div>
    </div>
  );
}

function DesktopInstructions() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cobalt/10 border border-cobalt/30 p-5">
        <h2 className="text-xl font-bold text-foreground mb-2">Install on Desktop</h2>
        <p className="text-sm text-muted-foreground">
          In Chrome or Edge, look for the install icon in the address bar (right side of
          the URL). Click it, then click <strong>Install</strong>.
        </p>
      </div>
    </div>
  );
}

// ── Apple-style icon SVGs (must match exactly what users see in iOS) ─────

function AppleShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
      <path d="M12 3v13" strokeWidth={2} strokeLinecap="round" />
      <path d="M7 8l5-5 5 5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function AddToHomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth={2} />
      <path d="M12 8v8M8 12h8" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
