"use client";

import { useEffect, useMemo, useState } from "react";
import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";
import { CaptureV2Orchestrator } from "./CaptureV2Orchestrator";
import { CaptureV2TaskHeader } from "./CaptureV2TaskHeader";
import type { CaptureV2Session } from "./session-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  session: CaptureV2Session;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
};

export function CaptureV2Shell(props: Props) {
  const { session } = props;
  const { capturedItems } = useSiteWalkSession();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const stopLabel = useMemo(() => {
    const count = capturedItems.length;
    return count > 0 ? `Stop ${count + 1}` : "Stop 1";
  }, [capturedItems.length]);

  const contextLabel = session.is_ad_hoc
    ? "Quick Walk"
    : session.project_name ?? "Plan Walk";

  return (
    <main className="relative flex h-screen min-h-0 w-full flex-col overflow-hidden bg-[#0B0F15] text-white">
      <CaptureV2TaskHeader session={session} stopLabel={stopLabel} contextLabel={contextLabel} />
      <CaptureV2Orchestrator {...props} isDesktop={isDesktop} />
    </main>
  );
}
