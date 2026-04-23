"use client";

import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/hooks/useInstallPrompt";
import { useState } from "react";

export function InstallBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-app dark:bg-app-card">
      <Download className="size-5 text-cobalt" />
      <div className="mr-2">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Install the Slate360 app
        </p>
        <p className="text-xs text-zinc-500">
          Free — add to home screen for the full experience
        </p>
      </div>
      <button
        onClick={async () => {
          await promptInstall();
        }}
        className="rounded-md bg-cobalt px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-cobalt-strong transition"
      >
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
