"use client";

import type { TwinCapturePendingSession } from "@/lib/digital-twin/twin-capture-pending-session";
import type { TwinJobCreditEstimate } from "@/lib/twin/processing-estimate-types";
import { TwinReviewSourcesScreen } from "./review-sources/TwinReviewSourcesScreen";

type Props = {
  devPreview?: {
    estimate: TwinJobCreditEstimate;
    session?: TwinCapturePendingSession;
    jobQueued?: boolean;
    mockCaptureId?: string;
  };
};

/** Shared M1 entry point for a web capture's post-capture Review & Sources screen. */
export function TwinCaptureReviewScreen({ devPreview }: Props) {
  return <TwinReviewSourcesScreen devPreview={devPreview} />;
}
