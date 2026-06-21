"use client";

import { useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { useEditorStore, layoutClips } from "./editor-store";
import { enqueueRender } from "./render-jobs";

// Explicit output dimensions per aspect × resolution tier (predictable, no rounding).
const ASPECTS: { id: string; label: string; dims: Record<string, [number, number]> }[] = [
  { id: "16:9", label: "Landscape", dims: { "1080": [1920, 1080], "720": [1280, 720] } },
  { id: "9:16", label: "Vertical", dims: { "1080": [1080, 1920], "720": [720, 1280] } },
  { id: "1:1", label: "Square", dims: { "1080": [1080, 1080], "720": [720, 720] } },
  { id: "4:5", label: "Portrait", dims: { "1080": [1080, 1350], "720": [864, 1080] } },
];
const QUALITIES = [
  { id: "draft", label: "Draft" },
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
];

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Export settings modal → enqueues a render job. */
export function ExportDialog({ onClose, onQueued }: { onClose: () => void; onQueued: () => void }) {
  const clips = useEditorStore((s) => s.clips);
  const [aspectId, setAspectId] = useState("16:9");
  const [res, setRes] = useState("1080");
  const [quality, setQuality] = useState("standard");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const aspect = ASPECTS.find((a) => a.id === aspectId)!;
  const [width, height] = aspect.dims[res];
  const timelineSec = useMemo(() => layoutClips(clips).total, [clips]);
  const estCredits = Math.max(1, Math.ceil(timelineSec / 60));

  async function go() {
    setBusy(true);
    setErr(null);
    const r = await enqueueRender({ aspect: aspectId, width, height, quality, fps: 30 });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Failed."); return; }
    onQueued();
    onClose();
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#0B0F15] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Export</h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <Field label="Aspect ratio">
          <div className="grid grid-cols-4 gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspectId(a.id)}
                className={`rounded-md border px-1 py-1.5 text-[11px] transition-colors ${
                  aspectId === a.id ? "border-[#3D8EFF]/50 bg-[#3D8EFF]/20 text-white" : "border-white/10 text-white/55 hover:bg-white/5"
                }`}
              >
                <div className="font-medium">{a.id}</div>
                <div className="text-[9px] text-white/40">{a.label}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Resolution">
          <Segmented options={[{ id: "1080", label: "1080p" }, { id: "720", label: "720p" }]} value={res} onChange={setRes} />
        </Field>

        <Field label="Quality">
          <Segmented options={QUALITIES} value={quality} onChange={setQuality} />
        </Field>

        <div className="mb-4 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55">
          <span>{width}×{height} · {fmtClock(timelineSec)}</span>
          <span className="font-mono text-white/75">~{estCredits} credit{estCredits === 1 ? "" : "s"}</span>
        </div>

        {err && <p className="mb-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{err}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:bg-white/5">Cancel</button>
          <button
            type="button"
            onClick={go}
            disabled={busy || clips.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-[#3D8EFF] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {busy ? "Queuing…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-white/10">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 px-2 py-1.5 text-xs transition-colors ${
            value === o.id ? "bg-[#3D8EFF]/20 text-white" : "text-white/55 hover:bg-white/5"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
