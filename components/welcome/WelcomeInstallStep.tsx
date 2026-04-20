"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download, Smartphone } from "lucide-react";

type Device = "ios" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface Props {
  device: Device;
  deferredPrompt: BeforeInstallPromptEvent | null;
  qrUrl: string;
  userName: string;
  onContinue: () => void;
  onSkip: () => void;
  onPwaInstall: () => Promise<void>;
}

export function WelcomeInstallStep({
  device,
  deferredPrompt,
  qrUrl,
  userName,
  onContinue,
  onSkip,
  onPwaInstall,
}: Props) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-bold mb-3 text-foreground">
        Welcome to Slate360{userName ? `, ${userName}` : ""} 👋
      </h1>
      <p className="text-base text-muted-foreground mb-8 leading-relaxed">
        Install the app on your phone — it takes 10 seconds and unlocks the
        full experience: offline capture, camera, GPS, and push notifications.
      </p>

      <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center shadow-lg mb-8">
        {device === "desktop" && (
          <>
            <Smartphone className="w-12 h-12 text-cobalt mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Scan to install</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Point your phone&apos;s camera at this QR code to open the app.
            </p>
            <div className="bg-white p-4 rounded-xl mb-2">
              <QRCodeSVG value={qrUrl} size={160} level="M" />
            </div>
          </>
        )}

        {device === "ios" && (
          <>
            <Download className="w-12 h-12 text-cobalt mb-4" />
            <h3 className="text-xl font-semibold mb-4 text-foreground">Install on iPhone</h3>
            <ol className="text-left text-sm space-y-3 bg-glass border border-border p-4 rounded-lg w-full max-w-xs text-muted-foreground">
              <li>
                1. Tap the <span className="font-bold text-foreground">Share</span> icon at the bottom of Safari.
              </li>
              <li>
                2. Scroll down and tap <span className="font-bold text-foreground">Add to Home Screen</span>.
              </li>
              <li>
                3. Tap <span className="font-bold text-foreground">Add</span> in the top right.
              </li>
            </ol>
          </>
        )}

        {device === "android" && (
          <>
            <Download className="w-12 h-12 text-cobalt mb-4" />
            <h3 className="text-xl font-semibold mb-4 text-foreground">Install on Android</h3>
            {deferredPrompt ? (
              <button
                onClick={onPwaInstall}
                className="bg-cobalt text-white hover:bg-cobalt/90 h-11 px-6 rounded-lg font-semibold w-full max-w-xs"
              >
                Install App Now
              </button>
            ) : (
              <p className="text-sm text-muted-foreground max-w-xs">
                In Chrome, tap the menu (⋮) and choose{" "}
                <span className="font-bold text-foreground">Install app</span>.
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onContinue}
          className="bg-cobalt text-white hover:bg-cobalt/90 h-11 px-8 rounded-lg font-semibold w-full sm:w-auto"
        >
          I&apos;ve installed it — Continue
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
