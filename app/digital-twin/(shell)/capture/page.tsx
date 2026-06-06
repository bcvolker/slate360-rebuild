"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scan } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";

function detectLidarHint(): string {
  if (typeof navigator === "undefined") {
    return "Standard camera capture";
  }

  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const proModel = /iPhone1[2-9]|iPhone[2-9][0-9]|iPad Pro/i.test(ua);

  if (isIos && proModel) {
    return "LiDAR depth sensing available on this device";
  }

  return "Standard camera capture on this device";
}

export default function DigitalTwinCapturePage() {
  const [lidarHint, setLidarHint] = useState("Checking device capabilities…");

  useEffect(() => {
    setLidarHint(detectLidarHint());
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              twinAccent.iconChip,
            )}
          >
            <Scan className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100">Quick Capture</h2>
            <p className="text-xs text-zinc-400">{lidarHint}</p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-zinc-400">
          Walk the space and capture photos or depth scans. Processing and editing happen on
          desktop — your phone focuses on fast field capture.
        </p>
        <Link
          href="/projects"
          className={cn(
            "inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold",
            mobileTokens.mobilePrimaryButton,
            mobileTokens.focusRing,
          )}
        >
          Select a project workspace
        </Link>
        <Link
          href="/digital-twin/twins"
          className={cn("text-center text-xs", twinAccent.link)}
        >
          View captured twins
        </Link>
      </div>
    </div>
  );
}
