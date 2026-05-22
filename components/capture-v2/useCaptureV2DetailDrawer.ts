"use client";

import { useCallback, useEffect, useState } from "react";
import { useProjectCaptureSettings } from "@/lib/hooks/useProjectCaptureSettings";
import { CAPTURE_V2_DRAWER_CHIPS } from "./capture-v2-smart-chips";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

export type CaptureV2DrawerDetent = "default" | "expanded";

const DETENT_ORDER: CaptureV2DrawerDetent[] = ["default", "expanded"];

export function useCaptureV2DetailDrawer(
  loop: CaptureV2Loop,
  projectId: string | null,
  initialDetent: CaptureV2DrawerDetent = "default",
) {
  const [detent, setDetent] = useState<CaptureV2DrawerDetent>(initialDetent);
  const tradeSettings = useProjectCaptureSettings(projectId);

  useEffect(() => {
    if (loop.activeItem) setDetent(initialDetent);
  }, [initialDetent, loop.activeItem?.id]);

  const patchLocation = useCallback(
    (value: string) => {
      loop.setLocationLabel(value);
      if (loop.draft) loop.patchDraft({ notes: loop.draft.notes });
    },
    [loop],
  );

  const applyChip = useCallback(
    (index: number) => {
      if (!loop.draft) return;
      const chip = CAPTURE_V2_DRAWER_CHIPS[index];
      if (!chip) return;
      loop.patchDraft(chip.apply(loop.draft));
    },
    [loop],
  );

  const cycleDetent = useCallback(() => {
    setDetent((current) => {
      const index = DETENT_ORDER.indexOf(current);
      return DETENT_ORDER[(index + 1) % DETENT_ORDER.length] ?? "default";
    });
  }, []);

  return {
    locationLabel: loop.locationLabel,
    patchLocation,
    detent,
    setDetent,
    cycleDetent,
    applyChip,
    chips: CAPTURE_V2_DRAWER_CHIPS,
    tradeSettings,
  };
}
