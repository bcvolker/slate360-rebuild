"use client";

import { RotateCw, Scissors, Trash2 } from "lucide-react";
import { useEditorStore, layoutClips, type InspectorTab, type TimelineClip } from "./editor-store";
import { LevelDisclosureRow } from "./LevelDisclosureRow";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "clip", label: "Clip" },
  { id: "color", label: "Color" },
  { id: "audio", label: "Audio" },
  { id: "titles", label: "Titles" },
  { id: "enhance", label: "Enhance" },
  { id: "export", label: "Export" },
];

const SPEED_PRESETS = [0.25, 0.5, 1, 2, 4];

/** Right rail: context-driven property tabs bound to the selected clip. */
export function InspectorPanel() {
  const tab = useEditorStore((s) => s.inspectorTab);
  const setTab = useEditorStore((s) => s.setInspectorTab);
  const selectedId = useEditorStore((s) => s.selectedClipId);
  const clip = useEditorStore((s) => s.clips.find((c) => c.id === s.selectedClipId) ?? null);

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-white/10 bg-[#0B0F15]/60">
      <div className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">Inspector</div>
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
        {!selectedId && tab !== "export" && tab !== "color" && tab !== "titles" ? (
          <EmptyState />
        ) : tab === "clip" && clip ? (
          <ClipTab clip={clip} />
        ) : tab === "color" ? (
          <>
            <ActiveLookBanner />
            <LevelDisclosureRow label="Exposure" defaultStrength={50} />
            <LevelDisclosureRow label="Contrast" defaultStrength={50} />
            <LevelDisclosureRow label="Saturation" defaultStrength={50} />
            <LevelDisclosureRow label="Temperature" defaultStrength={50} />
            <NoteRow text="Click a Look in the Library tab to apply. Grades persist to the render spec on export." />
          </>
        ) : tab === "enhance" ? (
          <>
            <LevelDisclosureRow label="Denoise" defaultOn defaultStrength={60} />
            <LevelDisclosureRow label="Sharpen" defaultStrength={40} />
            <LevelDisclosureRow label="Stabilize" defaultStrength={50} />
            <LevelDisclosureRow label="Upscale 2×" defaultStrength={100} />
            <NoteRow text="Enhance runs as a cloud GPU job (slice 16) — produces a new derivative clip." />
          </>
        ) : tab === "audio" ? (
          <NoteRow text="Volume, fades, detach audio, and voiceover land in slices 11–12 (audio lanes + waveforms)." />
        ) : tab === "titles" ? (
          <NoteRow text="Pick a title or caption style from Library → Titles / Caption Styles. Full timeline lane lands in slice 13." />
        ) : tab === "export" ? (
          <NoteRow text="Aspect presets, quality, and the render queue land in slice 9." />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function ClipTab({ clip }: { clip: TimelineClip }) {
  const setClipSpeed = useEditorStore((s) => s.setClipSpeed);
  const setClipTrim = useEditorStore((s) => s.setClipTrim);
  const toggleReverse = useEditorStore((s) => s.toggleReverse);
  const removeClip = useEditorStore((s) => s.removeClip);
  const splitAtPlayhead = useEditorStore((s) => s.splitAtPlayhead);

  const rows = layoutClips([clip]).rows[0];
  const sp = clip.speedFactor || 1;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
        <div className="truncate text-sm text-white/90">{clip.name}</div>
        <div className="mt-1 flex gap-4 font-mono text-[11px] text-white/45">
          <span>src {fmt(clip.durationSec)}</span>
          <span>on timeline {fmt(rows?.lengthSec ?? 0)}</span>
        </div>
      </div>

      {/* Retime */}
      <Section title="Speed / retime">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.05}
            value={sp}
            onChange={(e) => setClipSpeed(clip.id, Number(e.target.value))}
            className="h-1 flex-1 accent-[#3D8EFF]"
          />
          <span className="w-12 text-right font-mono text-xs tabular-nums text-white/80">{sp.toFixed(2)}×</span>
        </div>
        <div className="mt-2 flex gap-1">
          {SPEED_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setClipSpeed(clip.id, p)}
              className={`flex-1 rounded-md border py-1 text-[11px] transition-colors ${
                Math.abs(sp - p) < 0.001 ? "border-[#3D8EFF]/50 bg-[#3D8EFF]/20 text-white" : "border-white/10 text-white/55 hover:bg-white/5"
              }`}
            >
              {p}×
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => toggleReverse(clip.id)}
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs transition-colors ${
            clip.reversed ? "border-[#3D8EFF]/50 bg-[#3D8EFF]/20 text-white" : "border-white/10 text-white/65 hover:bg-white/5"
          }`}
        >
          <RotateCw className="h-3.5 w-3.5" /> Reverse {clip.reversed ? "· on" : ""}
        </button>
      </Section>

      {/* Trim */}
      <Section title="Trim (source seconds)">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="In" value={clip.trimInSec} onChange={(v) => setClipTrim(clip.id, { trimInSec: v })} />
          <NumField label="Out" value={clip.trimOutSec} onChange={(v) => setClipTrim(clip.id, { trimOutSec: v })} />
        </div>
      </Section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={splitAtPlayhead}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          <Scissors className="h-3.5 w-3.5" /> Split
        </button>
        <button
          type="button"
          onClick={() => removeClip(clip.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red-400/30 py-1.5 text-xs text-red-300/80 hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>

      <NoteRow text="Detach audio, duplicate, transitions, and per-clip color land in slices 10–14." />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/40">{title}</div>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 py-1">
      <span className="font-mono text-[10px] uppercase text-white/40">{label}</span>
      <input
        type="number"
        step={0.1}
        min={0}
        value={Number(value.toFixed(2))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent text-right font-mono text-xs tabular-nums text-white/85 outline-none"
      />
    </label>
  );
}

function ActiveLookBanner() {
  const name = useEditorStore((s) => s.activeLookName);
  if (!name) return null;
  return (
    <div className="rounded-md border border-[#3D8EFF]/30 bg-[#3D8EFF]/10 px-3 py-2 text-xs text-white/80">
      Active look: <span className="font-medium text-white">{name}</span>
    </div>
  );
}

function NoteRow({ text }: { text: string }) {
  return <p className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-white/40">{text}</p>;
}

function EmptyState() {
  return <p className="px-1 pt-2 text-xs text-white/35">Select a clip on the timeline to edit it — retime, trim, reverse, split, and remove.</p>;
}

function fmt(sec: number): string {
  if (!sec || !isFinite(sec)) return "0.0s";
  return `${sec.toFixed(1)}s`;
}
