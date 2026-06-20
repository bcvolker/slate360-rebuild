"use client";

import { useState } from "react";
import { FolderOpen, Library, Plus } from "lucide-react";

type BinTab = "project" | "library";

const LIBRARY_CATEGORIES = [
  "Transitions",
  "Music",
  "Sound FX",
  "Titles",
  "Logos / Brand",
  "Looks",
  "Presets",
];

/** Left rail: project media vs the persistent org-level reusable Library. */
export function MediaBinPanel() {
  const [tab, setTab] = useState<BinTab>("project");

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-white/10 bg-[#0B0F15]/60">
      <PanelHeader title="Media" />
      <div className="flex items-center gap-1 px-2 pb-2">
        <BinTabButton active={tab === "project"} onClick={() => setTab("project")} label="Project" />
        <BinTabButton active={tab === "library"} onClick={() => setTab("library")} label="Library" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {tab === "project" ? <ProjectTab /> : <LibraryTab />}
      </div>
    </div>
  );
}

function ProjectTab() {
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 py-2 text-xs text-white/60 hover:bg-white/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Import from SlateDrop
      </button>
      <EmptyHint
        icon={<FolderOpen className="h-5 w-5" />}
        text="No media yet. Import clips, photos, music, or logos to begin."
      />
    </div>
  );
}

function LibraryTab() {
  return (
    <div className="space-y-1">
      {LIBRARY_CATEGORIES.map((cat) => (
        <div
          key={cat}
          className="flex items-center justify-between rounded-md border border-white/10 px-2.5 py-2 text-xs text-white/70"
        >
          <span>{cat}</span>
          <span className="text-white/30">0</span>
        </div>
      ))}
      <EmptyHint
        icon={<Library className="h-5 w-5" />}
        text="Saved transitions, music, titles, logos, and Looks reuse across every project."
      />
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">
      {title}
    </div>
  );
}

function BinTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        active ? "bg-[#3D8EFF]/20 text-white" : "text-white/50 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 px-3 text-center text-[11px] text-white/35">
      <span className="text-white/25">{icon}</span>
      {text}
    </div>
  );
}
