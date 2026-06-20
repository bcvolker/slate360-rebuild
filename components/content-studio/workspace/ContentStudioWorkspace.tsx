"use client";

import { CommandBar } from "./CommandBar";
import { MediaBinPanel } from "./MediaBinPanel";
import { PreviewPanel } from "./PreviewPanel";
import { InspectorPanel } from "./InspectorPanel";
import { TimelinePanel } from "./TimelinePanel";
import { useEditorStore } from "./editor-store";

/**
 * Content Studio workspace shell. Exact default geometry from the build plan:
 * top bar 44px · center row (Media 260 / Preview flex / Inspector 300) ~72% ·
 * Timeline ~28% (protected). Drag/dock/resize (dockview) lands in a later pass;
 * Preview + Timeline are always present (protected).
 */
export function ContentStudioWorkspace() {
  const showMediaBin = useEditorStore((s) => s.panelVisibility.mediaBin);
  const showInspector = useEditorStore((s) => s.panelVisibility.inspector);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#070A0F] text-white">
      <CommandBar projectTitle="Untitled edit" />

      {/* Center row */}
      <div className="grid min-h-0 flex-[0_0_72%]" style={{ gridTemplateColumns: gridCols(showMediaBin, showInspector) }}>
        {showMediaBin && <MediaBinPanel />}
        <PreviewPanel />
        {showInspector && <InspectorPanel />}
      </div>

      {/* Timeline (protected) */}
      <div className="min-h-[180px] flex-1">
        <TimelinePanel />
      </div>
    </div>
  );
}

function gridCols(mediaBin: boolean, inspector: boolean): string {
  const left = mediaBin ? "minmax(200px, 260px)" : "0px";
  const right = inspector ? "minmax(260px, 300px)" : "0px";
  return `${left} minmax(480px, 1fr) ${right}`;
}
