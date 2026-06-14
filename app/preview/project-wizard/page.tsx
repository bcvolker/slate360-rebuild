"use client";

import { MobileProjectCreateWizard } from "@/components/projects/mobile/MobileProjectCreateWizard";

export default function PreviewProjectWizard() {
  return (
    <div className="mx-auto h-[100dvh] w-full max-w-[420px] border-x border-white/10 bg-[var(--graphite-canvas)]">
      <MobileProjectCreateWizard />
    </div>
  );
}
