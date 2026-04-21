"use client";

import { useEffect, useState } from "react";

export type Platform =
  | "ios-safari"
  | "ios-other"
  | "ios-inapp"
  | "android-chrome"
  | "android-other"
  | "desktop"
  | "standalone"
  | null;

interface Detection {
  platform: Platform;
  inAppBrowser: string | null;
}

function detect(): Detection {
  if (typeof window === "undefined") return { platform: null, inAppBrowser: null };
  const ua = window.navigator.userAgent;

  // @ts-expect-error - non-standard iOS property
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) return { platform: "standalone", inAppBrowser: null };

  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  // In-app detection (these never have install capability)
  let inAppBrowser: string | null = null;
  if (/Instagram/.test(ua)) inAppBrowser = "Instagram";
  else if (/FBAN|FBAV/.test(ua)) inAppBrowser = "Facebook";
  else if (/Twitter/.test(ua)) inAppBrowser = "X (Twitter)";
  else if (/LinkedInApp/.test(ua)) inAppBrowser = "LinkedIn";
  else if (/TikTok/.test(ua)) inAppBrowser = "TikTok";
  else if (/Snapchat/.test(ua)) inAppBrowser = "Snapchat";
  else if (/Line\//.test(ua)) inAppBrowser = "Line";
  else if (/GSA\//.test(ua)) inAppBrowser = "Google App";

  if (isIOS) {
    if (inAppBrowser) return { platform: "ios-inapp", inAppBrowser };
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|mercury/.test(ua);
    return { platform: isSafari ? "ios-safari" : "ios-other", inAppBrowser: null };
  }

  if (isAndroid) {
    if (inAppBrowser) return { platform: "ios-inapp", inAppBrowser }; // same UI
    const isChrome = /Chrome/.test(ua) && !/EdgA|SamsungBrowser|OPR/.test(ua);
    return { platform: isChrome ? "android-chrome" : "android-other", inAppBrowser: null };
  }

  return { platform: "desktop", inAppBrowser: null };
}

export function usePlatform(): Detection {
  const [state, setState] = useState<Detection>({ platform: null, inAppBrowser: null });
  useEffect(() => {
    setState(detect());
    const onInstalled = () => setState((s) => ({ ...s, platform: "standalone" }));
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);
  return state;
}
