"use client";

import { useCallback, useMemo, useState } from "react";
import { persistCaptureInReport, persistReportSet, seedReportOrder } from "@/lib/thermal/curation-client";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

/**
 * Selection + report-set state shared across V2 tabs (doc §0.3 — Scope persists
 * across tabs, so this must live above any single tab). Shift-click range
 * selection follows the same anchor-index pattern as SlateDropFileArea.
 */
export function useLibrarySelection(
  sessionId: string,
  captures: ThermalV2Capture[],
  initialReportSet?: string[] | null,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  // Audit remediation Batch 2: restore session.metadata.report_set's ORDER, not
  // just which captures are starred — previously this always fell back to a
  // per-capture in_report/report_order scan, silently discarding the
  // operator's chosen sequence on every reload.
  const [reportOrder, setReportOrder] = useState<string[]>(() => seedReportOrder(captures, initialReportSet));

  const reportIds = useMemo(() => new Set(reportOrder), [reportOrder]);

  const click = useCallback(
    (id: string, index: number, opts: { shift?: boolean; toggle?: boolean } = {}) => {
      setFocusedId(id);
      setSelectedIds((prev) => {
        if (opts.shift && anchorIndex !== null) {
          const [lo, hi] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
          const range = captures.slice(lo, hi + 1).map((c) => c.id);
          return new Set([...prev, ...range]);
        }
        if (opts.toggle) {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        }
        return new Set([id]);
      });
      if (!opts.shift) setAnchorIndex(index);
    },
    [anchorIndex, captures],
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(captures.map((c) => c.id)));
  }, [captures]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const addToReport = useCallback(
    (ids: string[]) => {
      setReportOrder((prev) => {
        const toAdd = ids.filter((id) => !prev.includes(id));
        if (!toAdd.length) return prev;
        const next = [...prev, ...toAdd];
        toAdd.forEach((id, i) => void persistCaptureInReport(id, true, prev.length + i));
        void persistReportSet(sessionId, next);
        return next;
      });
    },
    [sessionId],
  );

  /** S7 Report outline drag-reorder — same session.metadata.report_set the ★ funnel writes to. */
  const reorderReport = useCallback(
    (next: string[]) => {
      setReportOrder(next);
      void persistReportSet(sessionId, next);
    },
    [sessionId],
  );

  /**
   * Audit remediation Batch 2: the outline was ★-add-only — there was no way to
   * pull an image back out short of finding it again in Library and un-starring
   * it. Mirrors addToReport's persistence (clears in_report so a future
   * report_set-less seed doesn't resurrect it).
   */
  const removeFromReport = useCallback(
    (id: string) => {
      setReportOrder((prev) => {
        if (!prev.includes(id)) return prev;
        const next = prev.filter((existing) => existing !== id);
        void persistCaptureInReport(id, false, -1);
        void persistReportSet(sessionId, next);
        return next;
      });
    },
    [sessionId],
  );

  return {
    selectedIds,
    focusedId,
    reportIds,
    reportOrder,
    click,
    selectAll,
    clearSelection,
    addToReport,
    reorderReport,
    removeFromReport,
  };
}
