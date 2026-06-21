"use client";

import { useEffect } from "react";
import { Clapperboard, Library, MessageSquare, PanelLeft, PanelRight, Redo2, RotateCcw, Type, Undo2, Upload } from "lucide-react";
import { useEditorStore, useUndoRedo, type EditorMode } from "./editor-store";

const MODES: { id: EditorMode; label: string }[] = [
  { id: "video", label: "Regular" },
  { id: "360", label: "360" },
  { id: "photo", label: "Photo" },
];

/** Top command bar (44px): brand, project, mode switcher, panel toggles, status, actions. */
export function CommandBar({
  projectTitle,
  saveStatus,
  mediaOpen,
  inspectorOpen,
  onToggleMedia,
  onToggleInspector,
  onExport,
  onOpenQueue,
  onOpenLibrary,
  queueLabel,
  queueActive,
}: {
  projectTitle: string;
  saveStatus?: "loading" | "saving" | "saved" | "idle";
  mediaOpen: boolean;
  inspectorOpen: boolean;
  onToggleMedia: () => void;
  onToggleInspector: () => void;
  onExport: () => void;
  onOpenQueue: () => void;
  onOpenLibrary: (category?: string) => void;
  queueLabel: string;
  queueActive: boolean;
}) {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);
  const resetLayout = useEditorStore((s) => s.resetLayout);
  const setLibraryCategory = useEditorStore((s) => s.setLibraryCategory);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  // ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo — skip while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (k === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0B0F15]/80 px-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Clapperboard className="h-4 w-4 text-[#3D8EFF]" />
        <span className="font-[var(--font-orbitron,inherit)] tracking-wide">Content Studio</span>
        <span className="text-white/30">·</span>
        <span className="max-w-[220px] truncate text-white/70">{projectTitle}</span>
        {saveStatus && saveStatus !== "idle" && (
          <span className="ml-1 text-[10px] font-normal text-white/35">
            {saveStatus === "saving" ? "saving…" : saveStatus === "loading" ? "loading…" : "saved"}
          </span>
        )}
      </div>

      {/* Mode switcher — rectangular segmented tabs (no pills) */}
      <div className="ml-2 flex items-center overflow-hidden rounded-md border border-white/10">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === m.id
                ? "bg-[#3D8EFF]/20 text-white"
                : "text-white/55 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Panel toggles — collapse/show the side rails */}
      <div className="ml-2 flex items-center gap-1">
        <PanelToggle
          active={mediaOpen}
          onClick={onToggleMedia}
          title="Toggle Media Bin"
          icon={<PanelLeft className="h-3.5 w-3.5" />}
        />
        <PanelToggle
          active={inspectorOpen}
          onClick={onToggleInspector}
          title="Toggle Inspector"
          icon={<PanelRight className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Primary actions — CapCut density: shortcuts into Library + Inspector */}
      <div className="ml-2 flex items-center gap-1">
        <TextAction icon={<Library className="h-3.5 w-3.5" />} label="Library" onClick={() => onOpenLibrary()} />
        <TextAction icon={<Type className="h-3.5 w-3.5" />} label="Titles" onClick={() => { setLibraryCategory("Titles"); onOpenLibrary("Titles"); }} />
        <TextAction icon={<MessageSquare className="h-3.5 w-3.5" />} label="Captions" onClick={() => { setLibraryCategory("Caption Styles"); onOpenLibrary("Caption Styles"); }} />
      </div>

      {/* Undo / redo */}
      <div className="ml-2 flex items-center gap-1">
        <IconAction icon={<Undo2 className="h-3.5 w-3.5" />} title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
        <IconAction icon={<Redo2 className="h-3.5 w-3.5" />} title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Render queue chip — click to open the drawer */}
        <button
          type="button"
          onClick={onOpenQueue}
          title="Render queue"
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${queueActive ? "animate-pulse bg-[#3D8EFF]" : "bg-emerald-400/80"}`} />
          {queueLabel}
        </button>
        <button
          type="button"
          onClick={resetLayout}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/5"
          title="Reset layout"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Layout
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-md bg-[#3D8EFF] px-3 py-1 text-xs font-semibold text-white hover:brightness-110"
        >
          <Upload className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
    </div>
  );
}

function IconAction({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-white/55 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {icon}
    </button>
  );
}

function TextAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/65 hover:bg-white/5"
    >
      {icon}
      {label}
    </button>
  );
}

function PanelToggle({
  active,
  onClick,
  title,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-[#3D8EFF]/50 bg-[#3D8EFF]/20 text-white"
          : "border-white/10 text-white/45 hover:bg-white/5"
      }`}
    >
      {icon}
    </button>
  );
}
