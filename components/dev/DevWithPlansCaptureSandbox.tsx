"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CaptureProvider } from "@/components/site-walk/capture/CaptureContext";
import { WithPlansCaptureCanvas } from "@/components/capture-v2/plan-canvas/WithPlansCaptureCanvas";
import { DEV_MOCK_SESSION } from "@/lib/dev/mock-site-walk";
import {
  DEV_MOCK_PLAN_SET,
  DEV_MOCK_PLAN_SHEETS,
  DEV_MOCK_PLAN_SHEET_IMAGE_URLS,
} from "@/lib/dev/mock-plan-sheets";
import {
  devPlanPinStoreCount,
  devPlanPinStoreReset,
  installDevPlanPinFetchMock,
} from "@/lib/dev/dev-plan-pin-store";
import { measurePlanCaptureChromeLayout } from "@/lib/dev/measure-plan-capture-chrome-layout";
import { useDevCaptureLoop } from "@/lib/dev/use-dev-capture-loop";
import type { CaptureV2Session } from "@/components/capture-v2/session-types";

const ACTIVE_SHEET_ID = DEV_MOCK_PLAN_SHEETS[0]?.id ?? "dev-sheet-1";

export function DevWithPlansCaptureSandbox() {
  const searchParams = useSearchParams();
  const openPickerOnMount = searchParams?.get("picker") === "open";
  const loop = useDevCaptureLoop({ thumbCount: 3, liveMode: true });
  const [pinRefreshTick, setPinRefreshTick] = useState(0);
  const session: CaptureV2Session = {
    ...DEV_MOCK_SESSION,
    project_id: DEV_MOCK_PLAN_SET.project_id,
    project_name: "Dev Plan Walk",
  };

  const measureKey = useMemo(
    () => `${loop.items.length}:${searchParams?.get("sheet") ?? "1"}:${pinRefreshTick}`,
    [loop.items.length, pinRefreshTick, searchParams],
  );

  useEffect(() => {
    if (searchParams?.get("resetPins") === "1") devPlanPinStoreReset(ACTIVE_SHEET_ID);
  }, []);

  useEffect(() => {
    return installDevPlanPinFetchMock(session.id, session.project_id, ACTIVE_SHEET_ID);
  }, [session.id, session.project_id]);

  useEffect(() => {
    if (!openPickerOnMount) return;
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('[data-capture-chrome="plan-sheet-pill"]')?.click();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [openPickerOnMount]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const sample = measurePlanCaptureChromeLayout();
      if (sample) {
        const node = document.getElementById("dev-plan-capture-chrome-measure");
        if (node) node.textContent = JSON.stringify(sample);
      }
      const rapidNode = document.getElementById("dev-plan-pin-rapid-drop-measure");
      if (rapidNode) rapidNode.textContent = String(devPlanPinStoreCount(ACTIVE_SHEET_ID));
    };
    const timer = window.setTimeout(run, 180);
    window.addEventListener("resize", run);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", run);
    };
  }, [measureKey]);

  return (
    <div className="h-full min-h-0">
      <CaptureProvider>
        <WithPlansCaptureCanvas
          session={session}
          loop={loop}
          planSets={[DEV_MOCK_PLAN_SET]}
          planSheets={DEV_MOCK_PLAN_SHEETS}
          sheetImageUrls={DEV_MOCK_PLAN_SHEET_IMAGE_URLS}
          onPlanCaptureSaved={() => setPinRefreshTick((value) => value + 1)}
          devExposeMap
        />
      </CaptureProvider>
      <pre id="dev-plan-capture-chrome-measure" className="sr-only" aria-hidden />
      <pre id="dev-plan-pin-rapid-drop-measure" className="sr-only" aria-hidden />
    </div>
  );
}
