"use client";

import { useSearchParams } from "next/navigation";
import { TwinCaptureScreen } from "@/components/digital-twin/TwinCaptureScreen";
import type { TwinCaptureMode } from "@/hooks/useTwinCaptureSession";
import { MOCK_TWIN_SPACES } from "@/lib/dev/mock-twin-capture";

export const DEV_TWIN_CLIP_COUNTS = [0, 1, 4] as const;

function parseClipCount(value: string | null): (typeof DEV_TWIN_CLIP_COUNTS)[number] {
  const parsed = Number.parseInt(value ?? "", 10);
  return DEV_TWIN_CLIP_COUNTS.includes(parsed as (typeof DEV_TWIN_CLIP_COUNTS)[number])
    ? (parsed as (typeof DEV_TWIN_CLIP_COUNTS)[number])
    : 0;
}

function parseMode(value: string | null): TwinCaptureMode {
  return value === "photos" ? "photos" : "video";
}

export function DevTwinCaptureSandbox() {
  const searchParams = useSearchParams();
  const clipCount = parseClipCount(searchParams?.get("clips") ?? null);
  const initialMode = parseMode(searchParams?.get("mode") ?? null);

  return (
    <TwinCaptureScreen
      spaceName={MOCK_TWIN_SPACES[0]?.name}
      devSeedClipCount={clipCount}
      devInitialMode={initialMode}
      onCancel={() => {
        /* sandbox — no navigation */
      }}
    />
  );
}
