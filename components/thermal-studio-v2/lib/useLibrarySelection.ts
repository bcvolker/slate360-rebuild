"use client";

import { useCallback, useMemo, useState } from "react";
import { persistCaptureInReport, persistReportSet, seedReportOrder } from "@/lib/thermal/curation-client";
import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

/**
 * Selection + report-set state shared across V2 tabs (doc §0.3 — Scope persists
 * across tabs, so this must live above any single tab). Shift-click range
 * selection follows the same anchor-index pattern as SlateDropFileArea.
 */
export function useLibrarySelection(sessionId: string, captures: ThermalV2Capture[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [reportOrder, setReportOrder] = useState<string[]>(() => seedReportOrder(captures));

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
  };
}
