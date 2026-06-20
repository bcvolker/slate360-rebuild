"use client";

import { useEditorStore, type InspectorTab } from "./editor-store";
import { LevelDisclosureRow } from "./LevelDisclosureRow";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "clip", label: "Clip" },
  { id: "color", label: "Color" },
  { id: "audio", label: "Audio" },
  { id: "titles", label: "Titles" },
  { id: "enhance", label: "Enhance" },
  { id: "export", label: "Export" },
];

/** Right rail: context-driven property tabs. Content fills in as later slices land. */
export function InspectorPanel() {
  const tab = useEditorStore((s) => s.inspectorTab);
  const setTab = useEditorStore((s) => s.setInspectorTab);

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-white/10 bg-[#0B0F15]/60">
      <div className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">
        Inspector
      </div>
      <div className="flex flex-wrap gap-1 px-2 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2 py-1 text-xs transition-colors ${
              tab === t.id ? "bg-[#3D8EFF]/20 text-white" : "text-white/50 hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {tab === "enhance" ? (
          <>
            <LevelDisclosureRow label="Denoise" defaultOn defaultStrength={60} />
            <LevelDisclosureRow label="Sharpen" defaultStrength={40} />
            <LevelDisclosureRow label="Stabilize" defaultStrength={50} />
            <LevelDisclosureRow label="Upscale 2×" defaultStrength={100} />
          </>
        ) : tab === "color" ? (
          <>
            <LevelDisclosureRow label="Exposure" defaultStrength={50} />
            <LevelDisclosureRow label="Contrast" defaultStrength={50} />
            <LevelDisclosureRow label="Saturation" defaultStrength={50} />
            <LevelDisclosureRow label="Temperature" defaultStrength={50} />
          </>
        ) : (
          <p className="px-1 pt-2 text-xs text-white/35">
            Select a clip to edit its {tab} properties. Controls arrive as each
            feature ships.
          </p>
        )}
      </div>
    </div>
  );
}
