"use client";

import { TwinCaptureScreen } from "@/components/digital-twin/TwinCaptureScreen";
import { MOCK_TWIN_SPACES } from "@/lib/dev/mock-twin-capture";

export function DevTwinCaptureSandbox() {
  return (
    <TwinCaptureScreen
      spaceName={MOCK_TWIN_SPACES[0]?.name}
      onCancel={() => {
        /* sandbox — no navigation */
      }}
    />
  );
}
