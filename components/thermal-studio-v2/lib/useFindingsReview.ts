"use client";

import { useEffect, useRef, useState } from "react";
import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

export type FindingsReviewState = {
  accepted: Set<number>;
  dismissed: Set<number>;
  edits: Map<number, string>;
};

function seedFrom(capture: ThermalV2Capture | null): FindingsReviewState {
  const meta = (capture?.metadata ?? null) as Record<string, unknown> | null;
  const fr = (meta?.findings_review ?? null) as { accepted?: string[]; dismissed?: string[]; edits?: Record<string, string> } | null;
  return {
    accepted: new Set((fr?.accepted ?? []).map(Number).filter(Number.isFinite)),
    dismissed: new Set((fr?.dismissed ?? []).map(Number).filter(Number.isFinite)),
    edits: new Map(Object.entries(fr?.edits ?? {}).map(([k, v]) => [Number(k), v])),
  };
}

/** S6 AI Review: per-anomaly Accept/Dismiss/Edit state, seeded + autosaved via metadata.findings_review. */
export function useFindingsReview(capture: ThermalV2Capture | null) {
  const captureId = capture?.id ?? null;
  const [state, setState] = useState<FindingsReviewState>(() => seedFrom(capture));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState(seedFrom(capture));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  function persist(next: FindingsReviewState) {
    if (!captureId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void patchCaptureWithStatus(captureId, {
        findings_review: {
          accepted: [...next.accepted].map(String),
          dismissed: [...next.dismissed].map(String),
          edits: Object.fromEntries([...next.edits].map(([k, v]) => [String(k), v])),
        },
      });
    }, 400);
  }

  function accept(index: number) {
    setState((prev) => {
      const accepted = new Set(prev.accepted).add(index);
      const dismissed = new Set(prev.dismissed);
      dismissed.delete(index);
      const next = { ...prev, accepted, dismissed };
      persist(next);
      return next;
    });
  }

  function dismiss(index: number) {
    setState((prev) => {
      const dismissed = new Set(prev.dismissed).add(index);
      const accepted = new Set(prev.accepted);
      accepted.delete(index);
      const next = { ...prev, accepted, dismissed };
      persist(next);
      return next;
    });
  }

  function restore(index: number) {
    setState((prev) => {
      const dismissed = new Set(prev.dismissed);
      dismissed.delete(index);
      const next = { ...prev, dismissed };
      persist(next);
      return next;
    });
  }

  function setEdit(index: number, text: string) {
    setState((prev) => {
      const edits = new Map(prev.edits).set(index, text);
      const next = { ...prev, edits };
      persist(next);
      return next;
    });
  }

  function acceptAllSevere(severeIndexes: number[]) {
    setState((prev) => {
      const accepted = new Set(prev.accepted);
      const dismissed = new Set(prev.dismissed);
      for (const i of severeIndexes) {
        accepted.add(i);
        dismissed.delete(i);
      }
      const next = { ...prev, accepted, dismissed };
      persist(next);
      return next;
    });
  }

  return { ...state, accept, dismiss, restore, setEdit, acceptAllSevere };
}
