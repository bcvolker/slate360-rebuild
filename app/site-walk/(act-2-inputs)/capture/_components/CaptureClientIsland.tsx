"use client";

import { useState } from "react";
import { PagedWorkspace, type PagedWorkspacePage } from "@/components/shared/paged-workspace";
import { DataContextView } from "@/components/site-walk/capture/DataContextView";
import { VisualCaptureView } from "@/components/site-walk/capture/VisualCaptureView";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";

type Props = {
  sessionId: string;
  projectId: string | null;
  showPlanCanvas: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
};

export function CaptureClientIsland({ sessionId, projectId, showPlanCanvas, autoOpenCamera, launchId }: Props) {
  const [activePage, setActivePage] = useState("visual");
  const { items, assignees, activeItem, draft, saveState, aiState, aiMessage, selectItem, patchDraft, formatNotesWithAi } = useCaptureItems({ sessionId, projectId });

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
          onDraftChange={patchDraft}
          onFormatNotes={() => void formatNotesWithAi()}
          onBack={() => setActivePage("visual")}
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
