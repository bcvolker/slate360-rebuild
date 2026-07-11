"use client";

import { useEffect } from "react";
import type { useAnalyzeImage } from "@/components/thermal-studio-v2/lib/useAnalyzeImage";
import type { useSettingsClipboardActions } from "@/components/thermal-studio-v2/lib/useSettingsClipboardActions";
import type { HoverInfo } from "@/components/thermal-studio-v2/panels/analyze/AnalyzeCanvas";

/**
 * Analyze tab keyboard shortcuts: copy/paste settings, undo/redo, delete the
 * selected measurement, [ ] step through the working set, S5.6's Enhance-here
 * (E) and A/B flicker swap (\). Extracted out of AnalyzePanel for the
 * file-size gate.
 */
export function useAnalyzeKeyboardShortcuts({
  img,
  hover,
  clipboard,
  step,
}: {
  img: ReturnType<typeof useAnalyzeImage>;
  hover: HoverInfo;
  clipboard: ReturnType<typeof useSettingsClipboardActions>;
  step: (delta: number) => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        clipboard.copySettings();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void clipboard.pasteSettings();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) img.redo();
        else img.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        img.redo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && img.selectedId) {
        e.preventDefault();
        img.deleteSpot(img.selectedId);
        return;
      }
      // [ ] step through the working set (V2.1 rule 0.3).
      if (e.key === "[") {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key === "]") {
        e.preventDefault();
        step(1);
        return;
      }
      // S5.6 Enhance-here (⌖): center the span on the hovered temperature.
      if (e.key.toLowerCase() === "e" && !mod && hover) {
        e.preventDefault();
        img.enhanceHere(hover.tempC);
        return;
      }
      // S5.6 A/B flicker: swap the shown snapshot.
      if (e.key === "\\" && img.flickerActive) {
        e.preventDefault();
        img.toggleFlickerView();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, clipboard, hover, step]);
}
