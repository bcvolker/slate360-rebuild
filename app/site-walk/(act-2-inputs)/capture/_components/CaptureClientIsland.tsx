"use client";

import { useEffect, useRef, useState } from "react";
import { PagedWorkspace, type PagedWorkspacePage } from "@/components/shared/paged-workspace";
import { DataContextView } from "@/components/site-walk/capture/DataContextView";
import { VisualCaptureView } from "@/components/site-walk/capture/VisualCaptureView";
import { requestCameraCapture } from "@/components/site-walk/capture/capture-camera-events";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";
import type { CaptureItemDraft } from "@/lib/types/site-walk-capture";

type Props = {
  sessionId: string;
  projectId: string | null;
  showPlanCanvas: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
};

export function CaptureClientIsland({ sessionId, projectId, showPlanCanvas, autoOpenCamera, launchId }: Props) {
  const [activePage, setActivePage] = useState("visual");
  const [currentLocation, setCurrentLocation] = useState("Current location");
  const [itemDetail, setItemDetail] = useState("");
  const carryForwardRef = useRef<Partial<Pick<CaptureItemDraft, "classification" | "priority" | "status" | "assignedTo">> | null>(null);
  const appliedCarryRef = useRef<string | null>(null);
  const { items, assignees, activeItem, draft, saveState, aiState, aiMessage, selectItem, patchDraft, formatNotesWithAi } = useCaptureItems({ sessionId, projectId });

  useEffect(() => {
    const savedLocation = sessionStorage.getItem(`site-walk:current-location:${sessionId}`);
    if (savedLocation?.trim()) setCurrentLocation(savedLocation.trim());
  }, [sessionId]);

  useEffect(() => {
    sessionStorage.setItem(`site-walk:current-location:${sessionId}`, currentLocation);
  }, [currentLocation, sessionId]);

  useEffect(() => {
    if (!activeItem || !draft || appliedCarryRef.current === activeItem.id) return;
    appliedCarryRef.current = activeItem.id;
    const carry = carryForwardRef.current;
    if (carry) patchDraft(carry);
    setItemDetail(parseItemDetail(draft.title, currentLocation));
  }, [activeItem, currentLocation, draft, patchDraft]);

  function updateLocation(location: string) {
    const cleanLocation = location || "Current location";
    setCurrentLocation(cleanLocation);
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
    const nextLocation = window.prompt("Next location", currentLocation);
    if (nextLocation?.trim()) updateLocation(nextLocation.trim());
    setItemDetail("");
    setActivePage("visual");
    window.setTimeout(() => requestCameraCapture("camera", "next_item"), 150);
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
          onNewItemSameLocation={startNextItemSameLocation}
          onMoveLocation={moveToNewLocation}
        />
      ),
    },
  ];

  return (
    <PagedWorkspace
      pages={pages}
      initialPageId={activePage}
      activePageId={activePage}
      className="h-[100dvh]"
      viewportClassName="bg-slate-950"
      showChrome={false}
      onPageChange={setActivePage}
    />
  );
}

function parseItemDetail(title: string, location: string) {
  const prefix = `${location} — `;
  return title.startsWith(prefix) ? title.slice(prefix.length) : "";
}
