"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share, Plus, CheckCircle2, AlertTriangle, Download, ChevronDown } from "lucide-react";

type Platform = "ios" | "android" | "desktop" | "unknown";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(ua: string): Platform {
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Windows|Linux/.test(ua)) return "desktop";
  return "unknown";
}

function detectInAppBrowser(ua: string): string | null {
  if (/Instagram/.test(ua)) return "Instagram";
  if (/FBAN|FBAV/.test(ua)) return "Facebook";
  if (/Twitter/.test(ua)) return "X (Twitter)";
  if (/LinkedInApp/.test(ua)) return "LinkedIn";
  if (/Line\//.test(ua)) return "Line";
  if (/TikTok/.test(ua)) return "TikTok";
  if (/Snapchat/.test(ua)) return "Snapchat";
  if (/GSA\//.test(ua)) return "Google App";
  // Gmail iOS uses CriOS-like UA but inside its own webview — hard to detect reliably; skip.
  return null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  // @ts-expect-error - non-standard iOS property
  if (window.navigator.standalone === true) return true;
  // Other browsers
  return window.matchMedia("(display-mode: standalone)").matches;
}

export default function InstallClient() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [inApp, setInApp] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<"accepted" | "dismissed" | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(detectPlatform(ua));
    setInApp(detectInAppBrowser(ua));
    setInstalled(isStandalone());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
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

  // ── States ──────────────────────────────────────────────────────────────

  if (installed) {
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

  if (inApp) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-amber-300">
              You&rsquo;re inside the {inApp} browser
            </h2>
            <p className="text-sm text-amber-100/90 leading-relaxed">
              {inApp} won&rsquo;t let any website install as an app. You need to open this
              page in a real browser first.
            </p>
            <div className="rounded-lg bg-black/30 p-3 text-sm text-amber-100/80 space-y-2">
              <p className="font-semibold">How to fix:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Tap the <strong>···</strong> or <strong>⋯</strong> menu (usually top-right)</li>
                <li>Tap <strong>Open in Safari</strong> (iPhone) or <strong>Open in Chrome</strong> (Android)</li>
                <li>You&rsquo;ll land back on this page — then it&rsquo;ll work</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "ios") {
    return <IOSInstructions />;
  }

  if (platform === "android") {
    return (
      <AndroidInstructions
        canPrompt={!!deferredPrompt}
        installing={installing}
        installResult={installResult}
        onInstall={triggerInstall}
      />
    );
  }

  // Desktop / unknown
  return <DesktopInstructions />;
}

// ── Platform sections ─────────────────────────────────────────────────────

function IOSInstructions() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cobalt/10 border border-cobalt/30 p-5">
        <div className="flex items-center gap-2 text-cobalt text-sm font-semibold mb-1">
          <Smartphone className="h-4 w-4" /> iPhone &amp; iPad
        </div>
        <p className="text-sm text-foreground/90">
          Apple doesn&rsquo;t allow a one-tap install button on iPhone. You add Slate360 in
          three taps using Safari&rsquo;s Share menu.
        </p>
      </div>

      <Step number={1}>
        <p>
          Make sure you&rsquo;re in <strong>Safari</strong>. Look for the{" "}
          <span className="inline-flex items-center gap-1">
            <Share className="h-4 w-4 text-cobalt" />
            Share
          </span>{" "}
          icon at the bottom of the screen.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ChevronDown className="h-5 w-5 animate-bounce text-cobalt" />
          <span>It&rsquo;s in the toolbar at the bottom</span>
          <ChevronDown className="h-5 w-5 animate-bounce text-cobalt" />
        </div>
      </Step>

      <Step number={2}>
        <p>
          Tap{" "}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cobalt/15 text-cobalt font-medium">
            <Share className="h-3.5 w-3.5" /> Share
          </span>{" "}
          — a panel slides up.
        </p>
      </Step>

      <Step number={3}>
        <p>
          Scroll down inside that panel and tap{" "}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cobalt/15 text-cobalt font-medium">
            <Plus className="h-3.5 w-3.5" /> Add to Home Screen
          </span>
          .
        </p>
      </Step>

      <Step number={4}>
        <p>
          Tap <strong>Add</strong> in the top-right. Slate360 now lives on your home
          screen like any other app.
        </p>
      </Step>

      <div className="rounded-xl border border-app bg-app-card p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Don&rsquo;t see the Share icon?</p>
        <p>
          You&rsquo;re probably in Chrome, Firefox, or another browser. On iPhone these all
          use Safari&rsquo;s engine, but only <strong>Safari itself</strong> can add apps to
          your home screen. Copy this page&rsquo;s URL and paste it into Safari.
        </p>
      </div>
    </div>
  );
}

function AndroidInstructions({
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
        <div className="flex items-center gap-2 text-cobalt text-sm font-semibold">
          <Smartphone className="h-4 w-4" /> Android
        </div>
        {canPrompt ? (
          <button
            onClick={onInstall}
            disabled={installing}
            className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl bg-cobalt text-white text-base font-bold hover:bg-cobalt-hover disabled:opacity-50"
          >
            <Download className="h-5 w-5" />
            {installing ? "Installing…" : "Install Slate360"}
          </button>
        ) : (
          <p className="text-sm text-foreground/90">
            Your browser didn&rsquo;t offer a one-tap install. Use the manual steps below
            (works in Chrome, Edge, Samsung Internet).
          </p>
        )}
        {installResult === "dismissed" && (
          <p className="text-xs text-amber-300">
            You dismissed the install prompt. Refresh the page to try again.
          </p>
        )}
      </div>

      {!canPrompt && (
        <>
          <Step number={1}>
            <p>Open this page in <strong>Chrome</strong> (or Edge / Samsung Internet).</p>
          </Step>
          <Step number={2}>
            <p>
              Tap the <strong>⋮</strong> menu in the top-right.
            </p>
          </Step>
          <Step number={3}>
            <p>
              Tap{" "}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cobalt/15 text-cobalt font-medium">
                <Download className="h-3.5 w-3.5" /> Install app
              </span>{" "}
              (or <strong>Add to Home screen</strong>).
            </p>
          </Step>
          <Step number={4}>
            <p>Confirm by tapping <strong>Install</strong>.</p>
          </Step>
        </>
      )}
    </div>
  );
}

function DesktopInstructions() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cobalt/10 border border-cobalt/30 p-5">
        <div className="flex items-center gap-2 text-cobalt text-sm font-semibold mb-1">
          <Smartphone className="h-4 w-4" /> Desktop
        </div>
        <p className="text-sm text-foreground/90">
          In Chrome or Edge, look for the install icon in the address bar (right side of
          the URL).
        </p>
      </div>
      <Step number={1}>
        <p>
          Open this page in <strong>Chrome</strong> or <strong>Edge</strong>.
        </p>
      </Step>
      <Step number={2}>
        <p>
          Click the{" "}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cobalt/15 text-cobalt font-medium">
            <Download className="h-3.5 w-3.5" /> Install
          </span>{" "}
          icon in the address bar.
        </p>
      </Step>
      <Step number={3}>
        <p>Click <strong>Install</strong>. Slate360 opens in its own window.</p>
      </Step>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cobalt text-white text-sm font-bold flex items-center justify-center">
        {number}
      </div>
      <div className="flex-1 pt-1 text-sm text-foreground/90 space-y-1">{children}</div>
    </div>
  );
}
