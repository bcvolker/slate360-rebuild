"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Map } from "lucide-react";
import { CaptureDataBottomSheet } from "@/components/site-walk/capture/CaptureDataBottomSheet";
import { PlanViewer } from "@/components/site-walk/capture/PlanViewer";
import { VisualCaptureView } from "@/components/site-walk/capture/VisualCaptureView";
import { requestCameraCapture } from "@/components/site-walk/capture/capture-camera-events";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";
import { useDeviceContext, type DeviceCaptureInput } from "@/lib/hooks/useDeviceContext";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { CaptureItemDraft } from "@/lib/types/site-walk-capture";
import { WalkStartChoice } from "./WalkStartChoice";

type Props = {
  sessionId: string;
  projectId: string | null;
  walkName: string;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
};

type WalkMode = "choice" | "plan" | "camera";

export function CaptureClientIsland({ sessionId, projectId, walkName, showPlanCanvas, showStartChoice, autoOpenCamera, launchId, initialItemId, planSets, planSheets }: Props) {
  const [walkMode, setWalkMode] = useState<WalkMode>(() => showStartChoice ? "choice" : showPlanCanvas ? "plan" : "camera");
  const [currentLocation, setCurrentLocation] = useState("Stop 1");
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const carryForwardRef = useRef<Partial<Pick<CaptureItemDraft, "classification" | "trade" | "priority" | "status" | "assignedTo">> | null>(null);
  const appliedCarryRef = useRef<string | null>(null);
  const returnToPlanAfterSaveRef = useRef(false);
  const { primaryCaptureInput } = useDeviceContext();
  const { items, assignees, activeItem, draft, saveState, aiState, aiMessage, selectItem, patchDraft, saveMarkupData, savePhotoAttachmentPins, formatNotesWithAi } = useCaptureItems({ sessionId, projectId });

  useEffect(() => {
    if (!initialItemId || activeItem?.id === initialItemId) return;
    const target = items.find((item) => item.id === initialItemId || item.client_item_id === initialItemId);
    if (target) selectItem(target);
  }, [activeItem?.id, initialItemId, items, selectItem]);

  useEffect(() => {
    const savedLocation = sessionStorage.getItem(`site-walk:current-location:${sessionId}`);
    if (savedLocation?.trim()) setCurrentLocation(savedLocation.trim());
    const savedRecent = sessionStorage.getItem(`site-walk:recent-locations:${sessionId}`);
    if (savedRecent) setRecentLocations(parseRecentLocations(savedRecent));
  }, [sessionId]);

  useEffect(() => {
    sessionStorage.setItem(`site-walk:current-location:${sessionId}`, currentLocation);
  }, [currentLocation, sessionId]);

  useEffect(() => {
    sessionStorage.setItem(`site-walk:recent-locations:${sessionId}`, JSON.stringify(recentLocations));
  }, [recentLocations, sessionId]);

  useEffect(() => {
    if (!activeItem || !draft || appliedCarryRef.current === activeItem.id) return;
    appliedCarryRef.current = activeItem.id;
    if (carryForwardRef.current) patchDraft(carryForwardRef.current);
  }, [activeItem, draft, patchDraft]);

  function updateLocation(location: string) {
    const cleanLocation = location.trim() || "Stop 1";
    setCurrentLocation(cleanLocation);
    setRecentLocations((current) => [cleanLocation, ...current.filter((item) => item !== cleanLocation)].slice(0, 8));
    if (draft) patchDraft({ title: cleanLocation });
  }

  function rememberCarryForward() {
    if (!draft) return;
    carryForwardRef.current = {
      classification: draft.classification,
      trade: draft.trade,
      priority: draft.priority,
      status: draft.status,
      assignedTo: draft.assignedTo,
    };
  }

  function captureNow(input: DeviceCaptureInput = primaryCaptureInput) {
    requestCameraCapture(input, "next_item");
  }

  function saveNextStop(options: { fromPlanPin?: boolean } = {}) {
    rememberCarryForward();
    updateLocation(nextStopLabel(currentLocation, recentLocations));
    if (options.fromPlanPin || showPlanCanvas || returnToPlanAfterSaveRef.current) {
      returnToPlanAfterSaveRef.current = false;
      setWalkMode("plan");
      return;
    }
    window.setTimeout(captureNow, 150);
  }

  function openCameraMode(openCamera = false) {
    setWalkMode("camera");
    if (openCamera) window.setTimeout(captureNow, 150);
  }

  function handlePlanCaptureRequest(input: "camera" | "upload") {
    returnToPlanAfterSaveRef.current = true;
    setWalkMode("camera");
    window.setTimeout(() => requestCameraCapture(input, "plan_pin"), 180);
  }

  function handlePlanCaptureSaved() {
    saveNextStop({ fromPlanPin: true });
  }

  if (walkMode === "choice") {
    return <WalkStartChoice walkName={walkName} onPlanMode={() => setWalkMode("plan")} onCameraOnly={() => openCameraMode()} />;
  }

  const ghostImageUrl = findGhostImageUrl(items, activeItem?.id ?? null, currentLocation);

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-slate-950 text-white">
      {/* Layer 0: full-bleed capture background */}
      <div className="absolute inset-0 z-0">
        {walkMode === "plan" ? (
          <PlanViewer projectId={projectId} sessionId={sessionId} planSets={planSets} sheets={planSheets} onCaptureRequest={handlePlanCaptureRequest} />
        ) : (
          <VisualCaptureView
            sessionId={sessionId}
            autoOpenCamera={autoOpenCamera}
            launchId={launchId}
            items={items}
            activeItemId={activeItem?.id ?? null}
            modeLabel={showPlanCanvas ? "Plan-linked" : "Photos-only"}
            ghostImageUrl={ghostImageUrl}
            onMarkupChange={(itemId, markup) => void saveMarkupData(itemId, markup)}
            onAttachmentPinsChange={(itemId, pins) => void savePhotoAttachmentPins(itemId, pins)}
            onPlanCaptureSaved={handlePlanCaptureSaved}
            onSelectItem={selectItem}
          />
        )}
      </div>

      {/* Layer 1: mode switch and plan home affordance */}
      {showPlanCanvas && <CaptureModeToggle mode={walkMode === "plan" ? "plan" : "camera"} onPlan={() => setWalkMode("plan")} onCamera={() => openCameraMode()} />}
      {walkMode === "plan" && <SiteWalkHomeButton />}

      {/* Layer 2: draggable data entry bottom sheet */}
      <CaptureDataBottomSheet
        item={activeItem}
        items={items}
        assignees={assignees}
        draft={draft}
        saveState={saveState}
        aiState={aiState}
        aiMessage={aiMessage}
        currentLocation={currentLocation}
        onDraftChange={patchDraft}
        onCapture={captureNow}
        onFormatNotes={() => void formatNotesWithAi()}
        onSaveNextStop={saveNextStop}
      />
    </section>
  );
}

function CaptureModeToggle({ mode, onPlan, onCamera }: { mode: "plan" | "camera"; onPlan: () => void; onCamera: () => void }) {
  return <div className="fixed left-1/2 top-3 z-30 flex -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/75 p-1 shadow-2xl backdrop-blur-xl"><button type="button" onClick={onPlan} className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "plan" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}><Map className="h-3.5 w-3.5" /> Plan</button><button type="button" onClick={onCamera} className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "camera" ? "bg-amber-500 text-slate-950" : "text-white/70"}`}><Camera className="h-3.5 w-3.5" /> Camera</button></div>;
}

function SiteWalkHomeButton() {
  return <Link href="/site-walk" className="fixed right-3 top-3 z-30 inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/75 px-3 text-xs font-black text-white/80 shadow-2xl backdrop-blur-xl hover:border-amber-300/50 hover:text-amber-100"><ArrowLeft className="h-4 w-4" /> Home</Link>;
}

function parseRecentLocations(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function nextStopLabel(currentLocation: string, recentLocations: string[]) {
  const candidates = [currentLocation, ...recentLocations];
  const maxStop = candidates.reduce((max, label) => {
    const match = label.trim().match(/^stop\s+(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1);
  return `Stop ${maxStop + 1}`;
}

function findGhostImageUrl(items: { id: string; title: string; item_type: string; local_preview_url?: string | null }[], activeItemId: string | null, location: string) {
  const prefix = location.trim();
  return items.find((item) => item.id !== activeItemId && item.item_type === "photo" && item.title.startsWith(prefix) && item.local_preview_url)?.local_preview_url ?? null;
}