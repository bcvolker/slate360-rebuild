/** Mock Twin 360 review data — dev sandbox only, no backend calls. */

import type { TwinCapturePendingSession } from "@/lib/digital-twin/twin-capture-pending-session";
import type { TwinJobCreditEstimate } from "@/lib/twin/processing-estimate-types";

export const DEV_TWIN_REVIEW_ESTIMATE_SUFFICIENT: TwinJobCreditEstimate = {
  creditsRequired: 48,
  creditsBalance: 248,
  sufficient: true,
  assetCount: 2,
  estimatedMinutes: 18,
  frameCount: 17,
};

export const DEV_TWIN_REVIEW_ESTIMATE_LOW: TwinJobCreditEstimate = {
  creditsRequired: 96,
  creditsBalance: 12,
  sufficient: false,
  assetCount: 2,
  estimatedMinutes: 24,
  frameCount: 17,
};

export function createDevTwinReviewSession(): TwinCapturePendingSession {
  return {
    selection: {
      spaceId: "space-lobby",
      projectId: "project-riverside",
      spaceTitle: "Lobby — Level 1",
    },
    projectName: "Riverside Tower",
    quickMode: true,
    clips: [
      {
        id: "dev-clip-1",
        index: 1,
        mode: "video",
        durationSeconds: 42,
        frameCount: 1,
        files: [new File(["mock"], "walk.mp4", { type: "video/mp4" })],
        thumbnailUrl: null,
      },
      {
        id: "dev-clip-2",
        index: 2,
        mode: "photos",
        durationSeconds: 8,
        frameCount: 16,
        files: [new File(["mock"], "burst.jpg", { type: "image/jpeg" })],
        thumbnailUrl: null,
      },
    ],
  };
}
