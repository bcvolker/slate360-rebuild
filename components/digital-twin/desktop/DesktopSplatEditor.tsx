"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { type SplatMesh } from "@sparkjsdev/spark";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { defaultOpForTool, type TwinEditList, type TwinEditTool } from "@/lib/digital-twin/edit-list-types";
import { createSweepEdit } from "@/lib/digital-twin/splat-edit-runtime";
import { fetchSplatManifest } from "@/lib/digital-twin/twin-manifest";
import { DesktopSplatToolRail, type DesktopSplatTool } from "./DesktopSplatToolRail";
import { DesktopSplatViewport } from "./DesktopSplatViewport";
import { DesktopSplatLayers } from "./DesktopSplatLayers";

const SWEEP_DURATION_MS = 6000;

/** Sine ease-in-out for a smooth sweep feel. */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

type Props = {
  spaceId: string;
  spaceTitle: string;
  modelId: string;
  modelTitle: string;
  modelUrl: string;
  initialEditList: TwinEditList;
};

export function DesktopSplatEditor({
  spaceId,
  spaceTitle,
  modelId,
  modelTitle,
  modelUrl,
  initialEditList,
}: Props) {
  const [editList, setEditList] = useState<TwinEditList>(initialEditList);
  const [activeTool, setActiveTool] = useState<DesktopSplatTool>("select");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sweepActive, setSweepActive] = useState(false);

  const meshRef = useRef<SplatMesh | null>(null);
  const rafRef = useRef<number | null>(null);

  const pickEnabled = activeTool !== "select" && activeTool !== "sweep";

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const stopSweep = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setSweepActive(false);
    setActiveTool("select");
  }, []);

  const startSweep = useCallback(async () => {
    const mesh = meshRef.current;
    if (!mesh) {
      showToast("Model not loaded yet");
      setActiveTool("select");
      return;
    }

    // Fetch bounds from manifest; fall back to reasonable interior defaults.
    const manifest = await fetchSplatManifest(modelUrl);
    const yMin = manifest?.bounds?.min?.[1] ?? -2;
    const yMax = manifest?.bounds?.max?.[1] ?? 4;

    const sweepEdit = createSweepEdit();
    sweepEdit.position.y = yMin;
    mesh.add(sweepEdit);
    setSweepActive(true);

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / SWEEP_DURATION_MS, 1);
      const t = easeInOutSine(rawT);
      sweepEdit.position.y = yMin + (yMax - yMin) * t;

      if (rawT < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        // Animation complete — clean up and reset.
        mesh.remove(sweepEdit);
        rafRef.current = null;
        setSweepActive(false);
        setActiveTool("select");
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [modelUrl]);

  // When activeTool becomes "sweep", kick off the animation automatically.
  useEffect(() => {
    if (activeTool !== "sweep") return;
    // If a sweep is already running, let it finish; don't double-start.
    if (sweepActive) return;
    void startSweep();
  }, [activeTool, sweepActive, startSweep]);

  // Clean up RAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleToolChange = useCallback(
    (tool: DesktopSplatTool) => {
      // If sweep is running and user switches away, stop it.
      if (sweepActive && tool !== "sweep") {
        stopSweep();
      }
      setActiveTool(tool);
    },
    [sweepActive, stopSweep],
  );

  const handlePick = useCallback(
    (point: { x: number; y: number; z: number }) => {
      if (activeTool === "select" || activeTool === "sweep") return;
      const op = defaultOpForTool(activeTool as TwinEditTool, [point.x, point.y, point.z]);
      setEditList((prev) => [...prev, op]);
      setDirty(true);
      showToast(`${op.label} placed`);
    },
    [activeTool],
  );

  const toggleLayer = (id: string) => {
    setEditList((prev) =>
      prev.map((op) => (op.id === id ? { ...op, enabled: op.enabled === false } : op)),
    );
    setDirty(true);
  };

  const removeLayer = (id: string) => {
    setEditList((prev) => prev.filter((op) => op.id !== id));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-twin/models/${modelId}/edit-list`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edit_list: editList }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setDirty(false);
      showToast("Edits saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{spaceTitle}</p>
          <p className="truncate text-xs text-zinc-500">{modelTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sweepActive ? (
            <button
              type="button"
              onClick={stopSweep}
              className={cn(twinAccent.button, "inline-flex items-center gap-1.5 animate-pulse")}
            >
              Stop sweep
            </button>
          ) : null}
          <Link href={`/digital-twin/twins/${spaceId}`} className={cn("text-xs", twinAccent.link)}>
            Viewer
          </Link>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className={cn(twinAccent.button, "inline-flex items-center gap-1.5")}
          >
            {saving ? (
              <IconLoader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <IconDeviceFloppy className="size-3.5" aria-hidden />
            )}
            Save edits
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
          twinAccent.iconChip,
        )}
      >
        <IconAlertTriangle className="size-4 shrink-0" aria-hidden />
        <span>
          SplatEdit is <strong className="font-semibold">experimental</strong> — edits are
          non-destructive overlays; source .spz stays immutable.
        </span>
      </div>

      <div className="flex min-h-[min(70vh,720px)] flex-1 gap-3">
        <DesktopSplatToolRail
          activeTool={activeTool}
          onToolChange={handleToolChange}
          disabled={saving}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <DesktopSplatViewport
            src={modelUrl}
            editList={editList}
            pickEnabled={pickEnabled}
            onPick={handlePick}
            meshRef={meshRef}
            className="flex-1"
          />
          <DesktopSplatLayers ops={editList} onToggle={toggleLayer} onRemove={removeLayer} />
        </div>
      </div>

      {toast ? (
        <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0B0F15]/95 px-4 py-2 text-xs text-zinc-100">
          {toast}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
