"use client";

import { useState } from "react";
import { MapPin, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourSceneRow } from "./TourStudioWorkspace";

export type PlanSheetSummary = {
  id: string;
  planSetId: string;
  sheetNumber: number;
  sheetName: string | null;
  imageUrl: string | null;
  width: number;
  height: number;
};

export type PlanSetSummary = { id: string; title: string; sheets: PlanSheetSummary[] };

export type PlanPinRow = {
  id: string;
  plan_sheet_id: string;
  scene_id: string;
  x_pct: number;
  y_pct: number;
  pin_number: number;
  title: string | null;
};

type Props = {
  loading: boolean;
  planSets: PlanSetSummary[];
  activeSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
  pins: PlanPinRow[];
  scenes: TourSceneRow[];
  onPlacePin: (xPct: number, yPct: number, sceneId: string) => void;
  onDeletePin: (pinId: string) => void;
  creatingPin: boolean;
};

/**
 * Plan-sheet pin authoring — a distinct concern from Build's scene/camera
 * settings (same split Kuula makes between its photo editor and "Floor plans
 * and maps" feature), so this lives as its own tab rather than a Build
 * sub-panel. Click the sheet where a scene should live, confirm which scene,
 * done — the same one-gesture-then-confirm pattern as "Set as start view".
 */
export function TourPlanTab({
  loading, planSets, activeSheetId, onSelectSheet, pins, scenes,
  onPlacePin, onDeletePin, creatingPin,
}: Props) {
  const [pendingClick, setPendingClick] = useState<{ xPct: number; yPct: number } | null>(null);
  const [chosenSceneId, setChosenSceneId] = useState<string>("");

  const activeSheet = planSets.flatMap((set) => set.sheets).find((s) => s.id === activeSheetId) ?? null;
  const readyScenes = scenes.filter((s) => s.status === "ready");

  if (loading) {
    return <div className="grid h-full place-items-center"><Loader2 className="size-6 animate-spin text-[var(--graphite-muted)]" /></div>;
  }

  if (planSets.length === 0) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-sm text-[var(--graphite-muted)]">
        This tour&apos;s project has no plan sheets yet. Upload a plan set from Site Walk&apos;s
        SlateDrop folder for this project, then come back here to pin scenes to it.
      </div>
    );
  }

  function handleSheetClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeSheet || readyScenes.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingClick({ xPct, yPct });
    setChosenSceneId(readyScenes[0]?.id ?? "");
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-52 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-[var(--mobile-app-card-border)] p-2 text-xs">
        {planSets.map((set) => (
          <div key={set.id} className="flex flex-col gap-1">
            <p className="truncate px-1.5 py-1 font-semibold text-[var(--graphite-text-header)]">{set.title}</p>
            {set.sheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => onSelectSheet(sheet.id)}
                className={`truncate rounded-lg px-2 py-1.5 text-left ${
                  activeSheetId === sheet.id
                    ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]"
                    : "text-[var(--graphite-muted)] hover:bg-[color-mix(in_srgb,var(--graphite-text-header)_6%,transparent)]"
                }`}
              >
                {sheet.sheetName ?? `Sheet ${sheet.sheetNumber}`}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="relative min-w-0 flex-1 overflow-auto bg-black p-4">
        {readyScenes.length === 0 && (
          <div className="mb-3 rounded-lg border border-[var(--mobile-app-card-border)] bg-white/[0.03] px-3 py-2 text-xs text-[var(--graphite-muted)]">
            No scenes ready to pin yet — upload panoramas in the Library tab first, then come back here.
          </div>
        )}
        {!activeSheet ? (
          <div className="grid h-full place-items-center text-sm text-[var(--graphite-muted)]">Select a sheet</div>
        ) : !activeSheet.imageUrl ? (
          <div className="grid h-full place-items-center text-sm text-[var(--graphite-muted)]">
            This sheet is still processing.
          </div>
        ) : (
          <div className="relative mx-auto w-fit">
            <div
              onClick={handleSheetClick}
              className={readyScenes.length > 0 ? "relative cursor-crosshair" : "relative"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeSheet.imageUrl} alt={activeSheet.sheetName ?? "Plan sheet"} className="max-h-[70vh] select-none" draggable={false} />
              {pins.filter((p) => p.plan_sheet_id === activeSheet.id).map((pin) => (
                <div
                  key={pin.id}
                  onClick={(e) => e.stopPropagation()}
                  style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}
                  className="group absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-[var(--graphite-primary)] text-[10px] font-bold text-black"
                >
                  {pin.pin_number}
                  <button
                    onClick={() => onDeletePin(pin.id)}
                    className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-sm bg-black/70 text-white group-hover:flex"
                    aria-label={`Remove pin ${pin.pin_number}`}
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {pendingClick && (
              <div
                style={{ left: `${pendingClick.xPct}%`, top: `${pendingClick.yPct}%` }}
                className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-2 rounded-lg border border-white/10 bg-[var(--graphite-canvas)] p-2 shadow-lg"
              >
                <select
                  value={chosenSceneId}
                  onChange={(e) => setChosenSceneId(e.target.value)}
                  className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-[var(--graphite-text-body)]"
                >
                  {readyScenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>{scene.title}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    disabled={creatingPin || !chosenSceneId}
                    onClick={() => { onPlacePin(pendingClick.xPct, pendingClick.yPct, chosenSceneId); setPendingClick(null); }}
                  >
                    <MapPin className="mr-1 size-3" /> Place pin
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setPendingClick(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
