"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadLocalPins,
  newPinId,
  saveLocalPins,
  type PinCategory,
  type PinScope,
  type TwinPinRecord,
} from "@/lib/digital-twin/pin-anchor";
import type { Vec3 } from "@/lib/digital-twin/s360-world";

const CATEGORIES: { id: PinCategory; label: string }[] = [
  { id: "note", label: "Note" },
  { id: "drawing", label: "Drawing" },
  { id: "rfi", label: "RFI" },
  { id: "submittal", label: "Submittal" },
  { id: "proposal", label: "Proposal" },
  { id: "invoice", label: "Invoice" },
  { id: "thermal", label: "Thermal" },
  { id: "photo", label: "Photo" },
  { id: "inspection", label: "Inspection" },
  { id: "report", label: "Report" },
  { id: "equipment", label: "Equipment" },
  { id: "punch", label: "Punch" },
  { id: "link", label: "Link" },
];

export function useHybridPinTool(args: {
  persistKey: string;
  epochId: string | null;
  modelId: string | null;
  spaceId: string | null;
  metricAvailable: boolean;
}) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("Pin");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [category, setCategory] = useState<PinCategory>("note");
  const [scope, setScope] = useState<PinScope>("project");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pins, setPins] = useState<TwinPinRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setPins(loadLocalPins(args.persistKey));
  }, [args.persistKey]);

  useEffect(() => {
    saveLocalPins(args.persistKey, pins);
  }, [args.persistKey, pins]);

  const visible = useMemo(
    () => pins.filter((p) => p.scope === "project" || !args.epochId || p.anchor.epochId === args.epochId),
    [pins, args.epochId],
  );

  const toggle = useCallback(() => {
    setActive((on) => {
      if (on) {
        setError(null);
        return false;
      }
      setError(args.metricAvailable ? null : "Pin on the metric mesh — no LiDAR/TSDF surface loaded.");
      return args.metricAvailable;
    });
  }, [args.metricAvailable]);

  const place = useCallback(
    (point: Vec3, normal: Vec3 | null, faceIndex: number | null) => {
      if (!args.metricAvailable) {
        setError("Pins must anchor to the metric mesh, not Gaussian centers.");
        return;
      }
      const now = new Date().toISOString();
      const pin: TwinPinRecord = {
        id: newPinId(),
        title: title.trim() || "Pin",
        description: [description.trim(), attachmentUrl.trim() ? `Link: ${attachmentUrl.trim()}` : ""]
          .filter(Boolean)
          .join("\n"),
        category,
        scope,
        anchor: {
          position: point,
          normal,
          sourceMeshId: args.modelId,
          epochId: args.epochId,
          faceIndex,
        },
        spaceId: args.spaceId,
        modelId: args.modelId,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
      };
      setPins((prev) => [pin, ...prev]);
      setSelectedId(pin.id);
      setActive(false);
      setError(null);
    },
    [args.epochId, args.metricAvailable, args.modelId, args.spaceId, attachmentUrl, category, description, scope, title],
  );

  const rename = useCallback((id: string, nextTitle: string) => {
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: nextTitle, updatedAt: new Date().toISOString() } : p)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
    setPendingDeleteId(null);
  }, []);

  return {
    categories: CATEGORIES,
    active,
    title,
    setTitle,
    description,
    setDescription,
    attachmentUrl,
    setAttachmentUrl,
    category,
    setCategory,
    scope,
    setScope,
    selectedId,
    setSelectedId,
    pins: visible,
    selected: visible.find((p) => p.id === selectedId) ?? null,
    error,
    pendingDeleteId,
    setPendingDeleteId,
    toggle,
    cancel: () => {
      setActive(false);
      setError(null);
    },
    place,
    rename,
    remove,
  };
}

export type HybridPinTool = ReturnType<typeof useHybridPinTool>;
