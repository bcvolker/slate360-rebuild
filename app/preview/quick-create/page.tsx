"use client";

import { SiteWalkQuickCreateProjectSheet } from "@/components/site-walk/SiteWalkQuickCreateProjectSheet";

export default function PreviewQuickCreate() {
  return (
    <div className="min-h-[844px] bg-[var(--graphite-canvas)]">
      <SiteWalkQuickCreateProjectSheet open onOpenChange={() => {}} />
    </div>
  );
}
