"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TwinCaptureReviewScreen } from "@/components/digital-twin/TwinCaptureReviewScreen";
import { setTwinCapturePendingSession } from "@/lib/digital-twin/twin-capture-pending-session";
import {
  DEV_TWIN_REVIEW_ESTIMATE_LOW,
  DEV_TWIN_REVIEW_ESTIMATE_SUFFICIENT,
  DEV_TWIN_REVIEW_SESSION,
} from "@/lib/dev/mock-twin-review";

export function DevTwinReviewSandbox() {
  const searchParams = useSearchParams();
  const lowCredits = searchParams?.get("credits") === "low";
  const openSheet = searchParams?.get("sheet") === "open";

  useEffect(() => {
    setTwinCapturePendingSession(DEV_TWIN_REVIEW_SESSION);
  }, []);

  return (
    <TwinCaptureReviewScreen
      canUseHighQuality
      devPreview={{
        estimate: lowCredits ? DEV_TWIN_REVIEW_ESTIMATE_LOW : DEV_TWIN_REVIEW_ESTIMATE_SUFFICIENT,
        openCreditsSheet: openSheet || lowCredits,
      }}
    />
  );
}
