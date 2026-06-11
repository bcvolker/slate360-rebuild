"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TwinCaptureReviewScreen } from "@/components/digital-twin/TwinCaptureReviewScreen";
import {
  createDevTwinReviewSession,
  DEV_TWIN_REVIEW_ESTIMATE_LOW,
  DEV_TWIN_REVIEW_ESTIMATE_SUFFICIENT,
} from "@/lib/dev/mock-twin-review";

export function DevTwinReviewSandbox() {
  const searchParams = useSearchParams();
  const lowCredits = searchParams?.get("credits") === "low";
  const openSheet = searchParams?.get("sheet") === "open";
  const jobQueued = searchParams?.get("submitted") === "1";
  const session = useMemo(() => createDevTwinReviewSession(), []);

  return (
    <TwinCaptureReviewScreen
      canUseHighQuality
      devPreview={{
        session,
        estimate: lowCredits ? DEV_TWIN_REVIEW_ESTIMATE_LOW : DEV_TWIN_REVIEW_ESTIMATE_SUFFICIENT,
        openCreditsSheet: openSheet || lowCredits,
        jobQueued,
        mockCaptureId: jobQueued ? "dev-capture-mock" : undefined,
      }}
    />
  );
}
