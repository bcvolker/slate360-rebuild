"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Captures the beforeinstallprompt event and exposes a controlled install trigger */
export function useInstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    const event = deferredRef.current;
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferredRef.current = null;
    setCanInstall(false);
    return outcome === "accepted";
  }, []);

  return { canInstall, promptInstall };
}
