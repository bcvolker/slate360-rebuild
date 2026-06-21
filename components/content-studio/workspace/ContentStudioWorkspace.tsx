"use client";

import { useEffect, useRef, useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { CommandBar } from "./CommandBar";
import { MediaBinPanel } from "./MediaBinPanel";
import { PreviewPanel } from "./PreviewPanel";
import { InspectorPanel } from "./InspectorPanel";
import { TimelinePanel } from "./TimelinePanel";
import { ExportDialog } from "./ExportDialog";
import { RenderQueueDrawer } from "./RenderQueueDrawer";
import { useRenderJobs } from "./render-jobs";
import { useEditorStore } from "./editor-store";
import { useMediaUpload } from "./use-media-upload";

/**
 * Content Studio workspace shell — Preview is the large focal point; every panel
 * is resizable (drag the handles) and the side rails are collapsible (toggle in
 * the command bar). Preview + Timeline are PROTECTED: resizable but never closed.
 * Full drag-to-reposition docking is a later enhancement; this delivers the
 * adjustable + collapsible workspace.
 */
export function ContentStudioWorkspace() {
  const mediaRef = useRef<ImperativePanelHandle>(null);
  const inspectorRef = useRef<ImperativePanelHandle>(null);

  const showMediaBin = useEditorStore((s) => s.panelVisibility.mediaBin);
  const showInspector = useEditorStore((s) => s.panelVisibility.inspector);
  const togglePanel = useEditorStore((s) => s.togglePanel);
  const setMediaBinTab = useEditorStore((s) => s.setMediaBinTab);
  const setLibraryCategory = useEditorStore((s) => s.setLibraryCategory);
  const { uploadFiles } = useMediaUpload();
  const { jobs, refetch } = useRenderJobs();
  const [exportOpen, setExportOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const activeCount = jobs.filter((j) => j.status === "queued" || j.status === "processing").length;
  const queueLabel = activeCount > 0 ? `${activeCount} rendering` : jobs.some((j) => j.status === "completed") ? "renders" : "idle";

  // Catch OS-file drops ANYWHERE in the editor: prevent the browser from opening
  // the file, and upload it. (Internal clip drags carry no "Files" — left alone.)
  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types?.includes("Files");
    const onDragOver = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.files?.length) { e.preventDefault(); void uploadFiles(e.dataTransfer.files); }
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [uploadFiles]);

  function toggleMedia() {
    const p = mediaRef.current;
    if (!p) return;
    p.isCollapsed() ? p.expand() : p.collapse();
  }
  function toggleInspector() {
    const p = inspectorRef.current;
    if (!p) return;
    p.isCollapsed() ? p.expand() : p.collapse();
  }

  function openLibrary(category?: string) {
    if (category) setLibraryCategory(category);
    else setMediaBinTab("library");
    const p = mediaRef.current;
    if (p?.isCollapsed()) p.expand();
    togglePanel("mediaBin");
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#070A0F] text-white">
      <CommandBar
        projectTitle="Untitled edit"
        mediaOpen={showMediaBin}
        inspectorOpen={showInspector}
        onToggleMedia={toggleMedia}
        onToggleInspector={toggleInspector}
        onExport={() => setExportOpen(true)}
        onOpenQueue={() => setQueueOpen(true)}
        onOpenLibrary={openLibrary}
        queueLabel={queueLabel}
        queueActive={activeCount > 0}
      />

      <PanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Center row */}
        <Panel defaultSize={72} minSize={40}>
          <PanelGroup direction="horizontal" className="h-full">
            <Panel
              ref={mediaRef}
              order={1}
              defaultSize={18}
              minSize={12}
              collapsible
              collapsedSize={0}
              onCollapse={() => showMediaBin && togglePanel("mediaBin")}
              onExpand={() => !showMediaBin && togglePanel("mediaBin")}
            >
              <MediaBinPanel />
            </Panel>
            <Handle vertical />

            {/* Preview — protected focal point */}
            <Panel order={2} defaultSize={60} minSize={30}>
              <PreviewPanel />
            </Panel>

            <Handle vertical />
            <Panel
              ref={inspectorRef}
              order={3}
              defaultSize={22}
              minSize={14}
              collapsible
              collapsedSize={0}
              onCollapse={() => showInspector && togglePanel("inspector")}
              onExpand={() => !showInspector && togglePanel("inspector")}
            >
              <InspectorPanel />
            </Panel>
          </PanelGroup>
        </Panel>

        <Handle />

        {/* Timeline — protected */}
        <Panel defaultSize={28} minSize={12}>
          <TimelinePanel />
        </Panel>
      </PanelGroup>

      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} onQueued={() => { setQueueOpen(true); refetch(); }} />}
      {queueOpen && <RenderQueueDrawer jobs={jobs} onClose={() => setQueueOpen(false)} />}
    </div>
  );
}

/**
 * Resize handle — a grabbable splitter. Wide hit area + resize cursor + a visible
 * center grip that brightens blue on hover/drag, so it's obvious you can drag it.
 */
function Handle({ vertical = false }: { vertical?: boolean }) {
  return (
    <PanelResizeHandle
      className={`group relative flex items-center justify-center bg-white/[0.04] transition-colors hover:bg-[#3D8EFF]/15 ${
        vertical ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"
      }`}
    >
      <div
        className={`rounded-sm bg-white/25 transition-colors group-hover:bg-[#3D8EFF] group-data-[resize-handle-state=drag]:bg-[#3D8EFF] ${
          vertical ? "h-8 w-[3px]" : "h-[3px] w-8"
        }`}
      />
    </PanelResizeHandle>
  );
}
