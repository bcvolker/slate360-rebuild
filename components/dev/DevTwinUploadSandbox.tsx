"use client";

import { TwinCaptureUploadState } from "@/components/digital-twin/TwinCaptureUploadState";
import { MOCK_TWIN_SPACES } from "@/lib/dev/mock-twin-capture";

export function DevTwinUploadSandbox() {
  return <TwinCaptureUploadState spaceName={MOCK_TWIN_SPACES[0]?.name} />;
}
