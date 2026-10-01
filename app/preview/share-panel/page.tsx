// Preview harness for the operator share panel (no login). The share POST is mocked by the QA script.
"use client";

import { StudioSharePanel } from "@/components/spatial-walkthrough/studio/StudioSharePanel";

export default function SharePanelPreview() {
  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)] p-4 text-[var(--graphite-text-body)] sm:p-6">
      <div className="mx-auto max-w-2xl">
        <StudioSharePanel
          walkthroughId="preview-walk"
          status="published"
          shares={[{ id: "s1", token_prefix: "Qx7hT2aB", policy: "client", is_revoked: false, expires_at: null }]}
          chapters={[{ id: "c1", name: "Level 2" }]}
          onRefresh={() => {}}
          onExport={() => {}}
        />
      </div>
    </div>
  );
}
