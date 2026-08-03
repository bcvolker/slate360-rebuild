"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";
import { isUnusableTwinSourceFile } from "@/lib/digital-twin/twin-review-media";
import type {
  TwinReviewAddedSource,
  TwinReviewSlateDropSource,
} from "@/lib/digital-twin/twin-capture-pending-session";
import type { TwinReviewSource } from "@/lib/digital-twin/review-source-types";
import type { TwinSourceChip } from "@/lib/digital-twin/twin-source-chip";

type Args = {
  captureId: string | null;
  sources: TwinReviewSource[];
  persistReview: (nextAddedSources: TwinReviewAddedSource[]) => void;
  setAddedSources: Dispatch<SetStateAction<TwinReviewAddedSource[]>>;
  setChipOverrides: Dispatch<SetStateAction<Record<string, TwinSourceChip>>>;
  setChangedAssetIds: Dispatch<SetStateAction<Set<string>>>;
  setSourceNotice: Dispatch<SetStateAction<string | null>>;
};

export function useM1ReviewSourceActions({
  captureId,
  sources,
  persistReview,
  setAddedSources,
  setChipOverrides,
  setChangedAssetIds,
  setSourceNotice,
}: Args) {
  const handleAddFiles = useCallback(
    (files: File[], origin: "camera_roll" | "files") => {
      const usable = files.filter((file) => !isUnusableTwinSourceFile(file));
      const rejected = files.length - usable.length;
      const next = usable.map((file, index) => ({
        id: `source-${Date.now()}-${index}-${file.name}`,
        origin,
        file,
      }));
      setSourceNotice(rejected ? "One or more files are not supported here yet." : null);
      if (!next.length) return;
      setAddedSources((prev) => {
        const merged = [...prev, ...next];
        persistReview(merged);
        return merged;
      });
    },
    [persistReview, setAddedSources, setSourceNotice],
  );

  const handleAddSlateDrop = useCallback(
    (files: SlateDropPickerFile[]) => {
      const usable = files.filter(
        (file) => !isUnusableTwinSourceFile(new File([], file.name, { type: file.type })),
      );
      const rejected = files.length - usable.length;
      const next: TwinReviewSlateDropSource[] = usable.map((file, index) => ({
        id: `slatedrop-${Date.now()}-${index}-${file.id}`,
        origin: "slatedrop",
        pickerFile: file,
      }));
      setSourceNotice(rejected ? "One or more files are not supported here yet." : null);
      if (!next.length) return;
      setAddedSources((prev) => {
        const merged = [...prev, ...next];
        persistReview(merged);
        return merged;
      });
    },
    [persistReview, setAddedSources, setSourceNotice],
  );

  const handleRemoveSource = useCallback(
    (sourceId: string) => {
      setAddedSources((prev) => {
        const next = prev.filter((source) => source.id !== sourceId);
        persistReview(next);
        return next;
      });
    },
    [persistReview, setAddedSources],
  );

  const handleChipChange = useCallback(
    async (sourceId: string, chip: TwinSourceChip) => {
      const source = sources.find((row) => row.id === sourceId);
      if (!source || !source.chipOptions.includes(chip)) return;
      setChipOverrides((prev) => ({ ...prev, [sourceId]: chip }));
      if (!source.assetId || !captureId) return;
      setChangedAssetIds((prev) => new Set(prev).add(source.assetId!));
      try {
        const response = await fetch(
          `/api/digital-twin/captures/${encodeURIComponent(captureId)}/assets/${encodeURIComponent(source.assetId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chip }),
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Could not save that source type");
        }
        setSourceNotice(null);
      } catch (error) {
        setSourceNotice(error instanceof Error ? error.message : "Could not save that source type");
      }
    },
    [captureId, setChangedAssetIds, setChipOverrides, setSourceNotice, sources],
  );

  return {
    handleAddFiles,
    handleAddSlateDrop,
    handleRemoveSource,
    handleChipChange,
  };
}
