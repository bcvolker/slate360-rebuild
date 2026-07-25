"use client";

import { useEffect, useState } from "react";
import {
  probeEquirectHint,
  type Twin360Hint,
} from "@/lib/digital-twin/twin-equirect-probe";

/**
 * P0b — measure which of `files` are equirectangular (360), keyed by File identity.
 *
 * Decoding metadata is async, but every call site that classifies media is synchronous,
 * so this hook holds the measured hints and re-renders once they land. Until a file has
 * been probed its hint is "unknown", and {@link classifyTwinMedia} falls back to the
 * filename heuristic — so the UI is never blocked and never worse than before.
 */
export function useEquirectHints(files: File[]): Map<File, Twin360Hint> {
  const [hints, setHints] = useState<Map<File, Twin360Hint>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const unprobed = files.filter((file) => !hints.has(file));
    if (unprobed.length === 0) return;

    void (async () => {
      const results = await Promise.all(
        unprobed.map(async (file) => [file, await probeEquirectHint(file)] as const),
      );
      if (cancelled) return;
      setHints((prev) => {
        const next = new Map(prev);
        for (const [file, hint] of results) next.set(file, hint);
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // `hints` is intentionally omitted: including it would re-run the effect on every
    // probe result and loop. New files are picked up via the `files` identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  return hints;
}

/** Read a hint out of the map, defaulting to "unknown" for not-yet-probed files. */
export function hintFor(
  hints: Map<File, Twin360Hint>,
  file: File,
): Twin360Hint {
  return hints.get(file) ?? "unknown";
}
