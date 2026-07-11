"use client";

import { useState } from "react";
import { copySettingsToClipboard, getClipboardSettings } from "@/components/thermal-studio-v2/lib/settings-clipboard";
import { applySettingsBatch } from "@/components/thermal-studio-v2/lib/settings-batch-api";
import type { useAnalyzeImage } from "@/components/thermal-studio-v2/lib/useAnalyzeImage";
import type { ThermalV2Capture, ThermalV2Scope, ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

type PasteToastState = {
  message: string;
  previous: Map<string, { palette: string; tuning: ThermalV2Tuning }>;
  ids: string[];
};

/**
 * W1 Copy/Paste settings (pulled out of AnalyzePanel.tsx for the file-size
 * gate). "This image" scope applies all four clipboard fields locally;
 * Selected/All batch-applies the two that persist per OTHER capture
 * (palette + tuning) with the same Keep/Undo pattern as AnalyzeTuning's
 * batch apply.
 */
export function useSettingsClipboardActions(
  img: ReturnType<typeof useAnalyzeImage>,
  scope: ThermalV2Scope,
  scopeIds: string[],
  captures: ThermalV2Capture[],
) {
  const [hasClip, setHasClip] = useState(() => getClipboardSettings() !== null);
  const [pasteToast, setPasteToast] = useState<PasteToastState | null>(null);

  function copySettings() {
    copySettingsToClipboard({ palette: img.palette, span: img.span, tuning: img.tuning, isotherm: img.isotherm });
    setHasClip(true);
  }

  async function pasteSettings() {
    const clip = getClipboardSettings();
    if (!clip) return;
    if (scope.kind === "image") {
      img.setPalette(clip.palette);
      if (clip.span) img.setSpan(clip.span);
      img.setTuning(clip.tuning);
      img.setIsotherm(clip.isotherm);
      return;
    }
    if (!scopeIds.length) return;
    const previous = new Map<string, { palette: string; tuning: ThermalV2Tuning }>();
    for (const id of scopeIds) {
      const cap = captures.find((c) => c.id === id);
      const meta = (cap?.metadata ?? null) as Record<string, unknown> | null;
      previous.set(id, {
        palette: typeof meta?.palette === "string" ? meta.palette : "Iron",
        tuning: (meta?.tuning as ThermalV2Tuning | undefined) ?? { emissivity: 0.95, reflected_c: 20 },
      });
    }
    const result = await applySettingsBatch(scopeIds, { palette: clip.palette, tuning: clip.tuning });
    setPasteToast({
      message: `Pasted settings to ${result.ok} image${result.ok === 1 ? "" : "s"}${result.failed ? ` (${result.failed} failed)` : ""}`,
      previous,
      ids: scopeIds,
    });
  }

  function keepPasteToast() {
    setPasteToast(null);
  }

  function undoPasteToast() {
    if (!pasteToast) return;
    for (const id of pasteToast.ids) {
      const prev = pasteToast.previous.get(id);
      if (prev) void applySettingsBatch([id], prev);
    }
    setPasteToast(null);
  }

  return { hasClip, pasteToast, copySettings, pasteSettings, keepPasteToast, undoPasteToast };
}
