"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeMeasurementValue,
  isClosedKind,
  minPointsForKind,
  type DisplayUnit,
  type MeasurementKind,
} from "@/lib/digital-twin/measurement-math";
import {
  loadLocalMeasurements,
  newMeasurementId,
  saveLocalMeasurements,
  type MeasurementScope,
  type TwinMeasurementRecord,
} from "@/lib/digital-twin/measurement-persist";
import type { Vec3 } from "@/lib/digital-twin/s360-world";

const KINDS: { id: MeasurementKind; label: string }[] = [
  { id: "distance", label: "Distance" },
  { id: "polyline", label: "Polyline" },
  { id: "height", label: "Height" },
  { id: "horizontal", label: "Horizontal" },
  { id: "area", label: "Area" },
  { id: "perimeter", label: "Perimeter" },
  { id: "angle", label: "Angle" },
  { id: "clearance", label: "Clearance" },
];

export function useHybridMeasureTool(args: {
  persistKey: string;
  epochId: string | null;
  modelId: string | null;
  spaceId: string | null;
  metricAvailable: boolean;
}) {
  const [active, setActive] = useState(false);
  const [kind, setKind] = useState<MeasurementKind>("distance");
  const [unit, setUnit] = useState<DisplayUnit>("m");
  const [scope, setScope] = useState<MeasurementScope>("project");
  const [draft, setDraft] = useState<Vec3[]>([]);
  const [hover, setHover] = useState<Vec3 | null>(null);
  const [rows, setRows] = useState<TwinMeasurementRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setRows(loadLocalMeasurements(args.persistKey));
  }, [args.persistKey]);

  useEffect(() => {
    saveLocalMeasurements(args.persistKey, rows);
  }, [args.persistKey, rows]);

  const visibleRows = useMemo(
    () =>
      rows.filter((m) => m.scope === "project" || !args.epochId || m.epochId === args.epochId),
    [rows, args.epochId],
  );

  const cancel = useCallback(() => {
    setActive(false);
    setDraft([]);
    setHover(null);
    setError(null);
  }, []);

  const toggle = useCallback(() => {
    setActive((on) => {
      if (on) {
        setDraft([]);
        setHover(null);
        setError(null);
        return false;
      }
      setError(args.metricAvailable ? null : "Metric measurement unavailable — no LiDAR/TSDF mesh.");
      return args.metricAvailable;
    });
  }, [args.metricAvailable]);

  const persistDraft = useCallback(
    (points: Vec3[], label?: string) => {
      const value = computeMeasurementValue(kind, points);
      if (value == null) return false;
      const now = new Date().toISOString();
      const row: TwinMeasurementRecord = {
        id: newMeasurementId(),
        kind,
        points,
        value,
        unit,
        label: label?.trim() || kind,
        hidden: false,
        scope,
        epochId: args.epochId,
        spaceId: args.spaceId,
        modelId: args.modelId,
        sourceMetricAssetId: args.modelId,
        source: "metric-mesh",
        createdAt: now,
        updatedAt: now,
        createdBy: null,
      };
      setRows((prev) => [row, ...prev]);
      setDraft([]);
      setHover(null);
      setActive(false);
      setError(null);
      return true;
    },
    [args.epochId, args.modelId, args.spaceId, kind, scope, unit],
  );

  const addPoint = useCallback(
    (point: Vec3) => {
      if (!args.metricAvailable) {
        setError("Metric measurement unavailable — Gaussian geometry is not used.");
        return;
      }
      setDraft((prev) => {
        const next = [...prev, point];
        const auto = kind !== "polyline" && !isClosedKind(kind);
        if (auto && next.length >= minPointsForKind(kind)) {
          persistDraft(next);
          return [];
        }
        return next;
      });
      setError(null);
    },
    [args.metricAvailable, kind, persistDraft],
  );

  const undo = useCallback(() => {
    setDraft((prev) => prev.slice(0, -1));
  }, []);

  const finish = useCallback(
    (label?: string) => {
      if (!persistDraft(draft, label)) {
        setError(`Need at least ${minPointsForKind(kind)} points.`);
        return false;
      }
      return true;
    },
    [draft, kind, persistDraft],
  );

  const rename = useCallback((id: string, label: string) => {
    setRows((prev) =>
      prev.map((m) => (m.id === id ? { ...m, label, updatedAt: new Date().toISOString() } : m)),
    );
  }, []);

  const toggleHidden = useCallback((id: string) => {
    setRows((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, hidden: !m.hidden, updatedAt: new Date().toISOString() } : m,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setRows((prev) => prev.filter((m) => m.id !== id));
    setPendingDeleteId(null);
  }, []);

  return {
    kinds: KINDS,
    active,
    kind,
    setKind,
    unit,
    setUnit,
    scope,
    setScope,
    draft,
    hover,
    setHover,
    rows: visibleRows,
    error,
    pendingDeleteId,
    setPendingDeleteId,
    toggle,
    cancel,
    addPoint,
    undo,
    finish,
    rename,
    toggleHidden,
    remove,
    canFinish: computeMeasurementValue(kind, draft) != null,
  };
}

export type HybridMeasureTool = ReturnType<typeof useHybridMeasureTool>;
