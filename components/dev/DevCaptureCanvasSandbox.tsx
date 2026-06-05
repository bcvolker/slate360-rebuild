"use client";

import { NoPlansCaptureCanvas } from "@/components/capture-v2/NoPlansCaptureCanvas";
import { useDevCaptureLoop } from "@/lib/dev/use-dev-capture-loop";
import { DEV_MOCK_CONTEXT_LABEL, DEV_MOCK_SESSION } from "@/lib/dev/mock-site-walk";

export function DevCaptureCanvasSandbox() {
  const loop = useDevCaptureLoop();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <NoPlansCaptureCanvas
        session={DEV_MOCK_SESSION}
        loop={loop}
        contextLabel={DEV_MOCK_CONTEXT_LABEL}
      />
    </div>
  );
}
