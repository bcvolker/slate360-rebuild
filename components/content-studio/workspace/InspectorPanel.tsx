"use client";

import { RotateCw, Scissors, Trash2 } from "lucide-react";
import { useEditorStore, layoutClips, DEFAULT_TITLE_STYLE, type InspectorTab, type TimelineClip } from "./editor-store";
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
          <ColorTab />
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
          <TitlesTab />
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

const COLOR_FIELDS: { key: "exposure" | "contrast" | "saturation" | "temperature"; label: string }[] = [
  { key: "exposure", label: "Exposure" },
  { key: "contrast", label: "Contrast" },
  { key: "saturation", label: "Saturation" },
  { key: "temperature", label: "Temperature" },
];

function ColorTab() {
  const scope = useEditorStore((s) => s.colorScope);
  const setScope = useEditorStore((s) => s.setColorScope);
  const setColor = useEditorStore((s) => s.setColor);
  const resetColor = useEditorStore((s) => s.resetColor);
  const selectedId = useEditorStore((s) => s.selectedClipId);
  const master = useEditorStore((s) => s.masterColor);
  const clipColor = useEditorStore((s) => s.clipColor);
  const lookName = useEditorStore((s) => s.activeLookName);

  const value = scope === "clip" && selectedId ? clipColor[selectedId] ?? master : master;

  return (
    <div className="space-y-3">
      {/* Scope: all clips (adjustment layer) vs the selected clip */}
      <div className="flex overflow-hidden rounded-md border border-white/10">
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`flex-1 px-2 py-1.5 text-xs transition-colors ${scope === "all" ? "bg-[#3D8EFF]/20 text-white" : "text-white/55 hover:bg-white/5"}`}
        >
          All clips
        </button>
        <button
          type="button"
          onClick={() => selectedId && setScope("clip")}
          disabled={!selectedId}
          className={`flex-1 px-2 py-1.5 text-xs transition-colors disabled:opacity-30 ${scope === "clip" ? "bg-[#3D8EFF]/20 text-white" : "text-white/55 hover:bg-white/5"}`}
        >
          This clip
        </button>
      </div>

      {lookName && scope === "all" && (
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/55">Look: {lookName}</div>
      )}

      {COLOR_FIELDS.map((f) => (
        <div key={f.key} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-white/85">{f.label}</span>
            <span className="font-mono text-xs tabular-nums text-white/60">{value[f.key] > 0 ? "+" : ""}{Math.round(value[f.key])}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            step={1}
            value={value[f.key]}
            onChange={(e) => setColor({ [f.key]: Number(e.target.value) })}
            className="h-1 w-full accent-[#3D8EFF]"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={resetColor}
        className="w-full rounded-md border border-white/10 py-1.5 text-xs text-white/65 hover:bg-white/5"
      >
        Reset {scope === "clip" ? "this clip" : "all"}
      </button>
      <NoteRow text="Changes preview live on the player and render on export. 'All clips' is your adjustment layer — apply a Library Look to set it for the whole edit." />
    </div>
  );
}

function TitlesTab() {
  const overlayItems = useEditorStore((s) => s.overlayItems);
  const selectedOverlayId = useEditorStore((s) => s.selectedOverlayId);
  const addTitle = useEditorStore((s) => s.addTitle);
  const update = useEditorStore((s) => s.updateOverlayItem);
  const removeOverlayItem = useEditorStore((s) => s.removeOverlayItem);
  const selectOverlay = useEditorStore((s) => s.selectOverlay);

  const titles = overlayItems.filter((o) => o.lane === "title");
  const sel = titles.find((o) => o.id === selectedOverlayId) ?? null;

  const AddBtn = (
    <button
      type="button"
      onClick={addTitle}
      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#3D8EFF] py-1.5 text-xs font-semibold text-white hover:brightness-110"
    >
      + Add title
    </button>
  );

  if (!sel) {
    return (
      <div className="space-y-3">
        {AddBtn}
        {titles.length > 0 && (
          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">Titles</div>
            {titles.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectOverlay(t.id)}
                className="flex w-full items-center justify-between rounded-md border border-white/10 px-2.5 py-1.5 text-left text-xs text-white/75 hover:bg-white/5"
              >
                <span className="truncate">{t.text || "Title"}</span>
                <span className="font-mono text-[10px] text-white/35">{t.startSec.toFixed(1)}s</span>
              </button>
            ))}
          </div>
        )}
        <NoteRow text="Add a title, then type and style it — it shows live on the preview. Burn-in on export lands next." />
      </div>
    );
  }

  const st = sel.titleStyle ?? DEFAULT_TITLE_STYLE;
  return (
    <div className="space-y-3">
      {AddBtn}
      <Section title="Text">
        <textarea
          value={sel.text ?? ""}
          onChange={(e) => update(sel.id, { text: e.target.value, name: e.target.value.slice(0, 24) || "Title" })}
          rows={2}
          className="w-full resize-none rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white/90 outline-none focus:border-[#3D8EFF]/50"
          placeholder="Type your title…"
        />
      </Section>

      <Section title="Style">
        <SliderRow label="Size" value={st.fontSize} min={12} max={96} suffix="px" onChange={(v) => update(sel.id, { titleStyle: { fontSize: v } })} />
        <div className="mt-2 flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] text-white/65">
            <span>Text</span>
            <input type="color" value={st.color} onChange={(e) => update(sel.id, { titleStyle: { color: e.target.value } })} className="h-5 w-7 cursor-pointer rounded border border-white/10 bg-transparent" />
          </label>
          <button
            type="button"
            onClick={() => update(sel.id, { titleStyle: { background: !st.background } })}
            className={`rounded-md border px-2 py-1 text-[11px] ${st.background ? "border-[#3D8EFF]/50 bg-[#3D8EFF]/20 text-white" : "border-white/10 text-white/55 hover:bg-white/5"}`}
          >
            Background
          </button>
        </div>
      </Section>

      <Section title="Position">
        <Seg options={[["top", "Top"], ["center", "Middle"], ["bottom", "Bottom"]]} value={st.position} onChange={(v) => update(sel.id, { titleStyle: { position: v as "top" | "center" | "bottom" } })} />
        <div className="mt-2">
          <Seg options={[["left", "Left"], ["center", "Center"], ["right", "Right"]]} value={st.align} onChange={(v) => update(sel.id, { titleStyle: { align: v as "left" | "center" | "right" } })} />
        </div>
      </Section>

      <Section title="Timing (seconds)">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Start" value={sel.startSec} onChange={(v) => update(sel.id, { startSec: Math.max(0, v) })} />
          <NumField label="Length" value={sel.durationSec} onChange={(v) => update(sel.id, { durationSec: Math.max(0.2, v) })} />
        </div>
      </Section>

      <button
        type="button"
        onClick={() => removeOverlayItem(sel.id)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-400/30 py-1.5 text-xs text-red-300/80 hover:bg-red-500/10"
      >
        Remove title
      </button>
    </div>
  );
}

function SliderRow({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[11px] text-white/65">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1 flex-1 accent-[#3D8EFF]" />
      <span className="w-12 text-right font-mono text-xs tabular-nums text-white/80">{Math.round(value)}{suffix}</span>
    </div>
  );
}

function Seg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-white/10">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex-1 px-2 py-1.5 text-[11px] transition-colors ${value === id ? "bg-[#3D8EFF]/20 text-white" : "text-white/55 hover:bg-white/5"}`}
        >
          {label}
        </button>
      ))}
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
