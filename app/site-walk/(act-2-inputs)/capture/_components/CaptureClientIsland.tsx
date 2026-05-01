"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Map } from "lucide-react";
import { PagedWorkspace, type PagedWorkspacePage } from "@/components/shared/paged-workspace";
import { DataContextView } from "@/components/site-walk/capture/DataContextView";
import { LocationPickerModal } from "@/components/site-walk/capture/LocationPickerModal";
import { PlanViewer } from "@/components/site-walk/capture/PlanViewer";
import { VisualCaptureView } from "@/components/site-walk/capture/VisualCaptureView";
import { requestCameraCapture } from "@/components/site-walk/capture/capture-camera-events";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";
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
};

type WalkMode = "choice" | "plan" | "camera";

export function CaptureClientIsland({ sessionId, projectId, walkName, showPlanCanvas, showStartChoice, autoOpenCamera, launchId, initialItemId }: Props) {
  const [walkMode, setWalkMode] = useState<WalkMode>(() => showStartChoice ? "choice" : showPlanCanvas ? "plan" : "camera");
  const [activePage, setActivePage] = useState("visual");
  const [currentLocation, setCurrentLocation] = useState("Stop 1");
  const [itemDetail, setItemDetail] = useState("");
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const carryForwardRef = useRef<Partial<Pick<CaptureItemDraft, "classification" | "priority" | "status" | "assignedTo">> | null>(null);
  const appliedCarryRef = useRef<string | null>(null);
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
    const carry = carryForwardRef.current;
    if (carry) patchDraft(carry);
    setItemDetail(parseItemDetail(draft.title, currentLocation));
  }, [activeItem, currentLocation, draft, patchDraft]);

  function updateLocation(location: string) {
    const cleanLocation = location.trim() || "Stop 1";
    setCurrentLocation(cleanLocation);
    setRecentLocations((current) => [cleanLocation.trim(), ...current.filter((item) => item !== cleanLocation.trim())].slice(0, 8));
    if (draft) {
      const cleanDetail = itemDetail.trim();
      patchDraft({ title: cleanDetail ? `${cleanLocation.trim()} — ${cleanDetail}` : cleanLocation.trim() });
    }
  }

  function updateItemDetail(detail: string) {
    setItemDetail(detail);
    const cleanLocation = currentLocation.trim();
    const cleanDetail = detail.trim();
    patchDraft({ title: cleanDetail ? `${cleanLocation} — ${cleanDetail}` : cleanLocation });
  }

  function rememberCarryForward() {
    if (!draft) return;
    carryForwardRef.current = {
      classification: draft.classification,
      priority: draft.priority,
      status: draft.status,
      assignedTo: draft.assignedTo,
    };
  }

  function startNextItemSameLocation() {
    rememberCarryForward();
    setItemDetail("");
    setActivePage("visual");
    window.setTimeout(() => requestCameraCapture("camera", "next_item"), 150);
  }

  function moveToNewLocation() {
    rememberCarryForward();
    applyNewLocation(nextStopLabel(currentLocation, recentLocations));
  }

  function finishWalk() {
    window.setTimeout(() => {
      window.location.href = `/site-walk/walks/${encodeURIComponent(sessionId)}`;
    }, saveState === "dirty" || saveState === "saving" ? 1700 : 0);
  }

  function applyNewLocation(location: string) {
    updateLocation(location);
    setItemDetail("");
    setActivePage("visual");
    window.setTimeout(() => requestCameraCapture("camera", "next_item"), 150);
  }

  const ghostImageUrl = findGhostImageUrl(items, activeItem?.id ?? null, currentLocation);

  function openCameraMode(openCamera = false) {
    setWalkMode("camera");
    setActivePage("visual");
    if (openCamera) window.setTimeout(() => requestCameraCapture("camera", "next_item"), 150);
  }

  if (walkMode === "choice") {
    return <WalkStartChoice walkName={walkName} onPlanMode={() => setWalkMode("plan")} onCameraOnly={() => openCameraMode()} />;
  }

  if (walkMode === "plan") {
    return (
      <>
        <PlanCaptureScreen projectId={projectId} sessionId={sessionId} onCamera={() => openCameraMode(true)} />
        <CaptureModeToggle mode="plan" onPlan={() => setWalkMode("plan")} onCamera={() => openCameraMode()} />
      </>
    );
  }

  const pages: PagedWorkspacePage[] = [
    {
      id: "visual",
      label: "Visual",
      content: (
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
          onSelectItem={selectItem}
          onNext={() => setActivePage("data")}
        />
      ),
    },
    {
      id: "data",
      label: "Data",
      content: (
        <DataContextView
          item={activeItem}
          draft={draft}
          assignees={assignees}
          saveState={saveState}
          aiState={aiState}
          aiMessage={aiMessage}
          currentLocation={currentLocation}
          itemDetail={itemDetail}
          onDraftChange={patchDraft}
          onLocationChange={updateLocation}
          onItemDetailChange={updateItemDetail}
          onFormatNotes={() => void formatNotesWithAi()}
          onBack={() => setActivePage("visual")}
          onAddAngle={startNextItemSameLocation}
          onSaveNextLocation={moveToNewLocation}
          onSaveFinishWalk={finishWalk}
        />
      ),
    },
  ];

  return (
    <>
      <PagedWorkspace
        pages={pages}
        initialPageId={activePage}
        activePageId={activePage}
        className="h-[100dvh]"
        viewportClassName="bg-slate-950"
        showChrome={false}
        swipeEnabled={false}
        onPageChange={setActivePage}
      />
      {showPlanCanvas && <CaptureModeToggle mode="camera" onPlan={() => setWalkMode("plan")} onCamera={() => openCameraMode()} />}
      <LocationPickerModal open={locationPickerOpen} currentLocation={currentLocation} recentLocations={recentLocations} onClose={() => setLocationPickerOpen(false)} onSelect={applyNewLocation} />
    </>
  );
}

function PlanCaptureScreen({ projectId, sessionId, onCamera }: { projectId: string | null; sessionId: string; onCamera: () => void }) {
  return (
    <section className="flex h-[100dvh] flex-col bg-slate-950 text-white">
      <header className="shrink-0 border-b border-cyan-300/10 bg-slate-950/95 px-3 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Walk with Plans</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-lg font-black">Master Plan Room</h1>
          <button type="button" onClick={onCamera} className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-cyan-300 px-3 text-xs font-black text-slate-950"><Camera className="h-4 w-4" /> Camera</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar"><PlanViewer projectId={projectId} sessionId={sessionId} /></div>
    </section>
  );
}

function CaptureModeToggle({ mode, onPlan, onCamera }: { mode: "plan" | "camera"; onPlan: () => void; onCamera: () => void }) {
  return <div className="fixed left-3 top-3 z-40 flex rounded-2xl border border-white/15 bg-slate-950/80 p-1 shadow-2xl backdrop-blur-xl"><button type="button" onClick={onPlan} className={`inline-flex h-8 items-center gap-1 rounded-xl px-2 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "plan" ? "bg-cyan-300 text-slate-950" : "text-white/70"}`}><Map className="h-3.5 w-3.5" /> Plan</button><button type="button" onClick={onCamera} className={`inline-flex h-8 items-center gap-1 rounded-xl px-2 text-[10px] font-black uppercase tracking-[0.1em] ${mode === "camera" ? "bg-cyan-300 text-slate-950" : "text-white/70"}`}><Camera className="h-3.5 w-3.5" /> Camera</button></div>;
}

function parseItemDetail(title: string, location: string) {
  const prefix = `${location} — `;
  return title.startsWith(prefix) ? title.slice(prefix.length) : "";
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
