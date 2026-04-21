"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Camera, Upload, Mic, FileText, Loader2, MapPin, CloudSun, CheckCircle2, AlertCircle } from "lucide-react";
import { captureMetadata, type CaptureMetadata } from "@/lib/site-walk/metadata";

type ItemLite = {
  id: string;
  item_type: string;
  title: string;
  s3_key: string | null;
  captured_at: string;
};

type Toast = { kind: "success" | "error"; text: string };

export default function CaptureClient({ sessionId, title }: { sessionId: string; title: string }) {
  const [items, setItems] = useState<ItemLite[]>([]);
  const [busy, setBusy] = useState<null | "upload" | "note" | "voice">(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [meta, setMeta] = useState<CaptureMetadata | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showNote, setShowNote] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadItems();
    void captureMetadata().then(setMeta);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadItems() {
    const r = await fetch(`/api/site-walk/items?session_id=${sessionId}`);
    const j = await r.json();
    setItems(j.items ?? []);
  }

  async function uploadPhoto(file: File) {
    setBusy("upload");
    try {
      const fresh = await captureMetadata();
      setMeta(fresh);

      const presign = await fetch("/api/site-walk/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          sessionId,
        }),
      });
      const pj = await presign.json();
      if (!presign.ok || !pj.uploadUrl) {
        setToast({ kind: "error", text: pj.error ?? "Upload preflight failed" });
        return;
      }

      const put = await fetch(pj.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
      if (!put.ok) {
        setToast({ kind: "error", text: `S3 upload failed (${put.status})` });
        return;
      }

      const create = await fetch("/api/site-walk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_type: "photo",
          title: file.name,
          s3_key: pj.s3Key,
          file_id: pj.fileId,
          latitude: fresh.gps?.latitude ?? null,
          longitude: fresh.gps?.longitude ?? null,
          weather: fresh.weather ?? null,
          metadata: { ...fresh, file_size: file.size, mime_type: file.type },
        }),
      });
      const cj = await create.json();
      if (!create.ok) {
        setToast({ kind: "error", text: cj.error ?? "Save failed" });
        return;
      }
      setToast({ kind: "success", text: "Photo captured" });
      await loadItems();
    } finally {
      setBusy(null);
    }
  }

  async function saveNote() {
    if (!noteText.trim()) return;
    setBusy("note");
    try {
      const fresh = await captureMetadata();
      setMeta(fresh);
      const res = await fetch("/api/site-walk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          item_type: "text_note",
          title: noteText.slice(0, 80),
          description: noteText,
          latitude: fresh.gps?.latitude ?? null,
          longitude: fresh.gps?.longitude ?? null,
          weather: fresh.weather ?? null,
          metadata: fresh,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setToast({ kind: "error", text: j.error ?? "Save failed" });
        return;
      }
      setNoteText("");
      setShowNote(false);
      setToast({ kind: "success", text: "Note saved" });
      await loadItems();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5 pb-24">
      <header>
        <h1 className="text-xl font-semibold truncate">{title}</h1>
        <p className="text-xs text-slate-500 mt-1">Session in progress · captures stamped with time, GPS, weather.</p>
      </header>

      {/* Live metadata strip */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Chip icon={<MapPin className="h-3 w-3" />} label={
          meta?.gps
            ? `${meta.gps.latitude.toFixed(4)}, ${meta.gps.longitude.toFixed(4)} ±${Math.round(meta.gps.accuracy_m)}m`
            : "GPS unavailable"
        } />
        <Chip icon={<CloudSun className="h-3 w-3" />} label={
          meta?.weather && meta.weather.source === "open-meteo"
            ? `${Math.round(meta.weather.temperature_f ?? 0)}°F · ${meta.weather.conditions ?? "—"}`
            : "Weather pending"
        } />
      </div>

      {/* Quick Start tiles */}
      <section className="grid grid-cols-2 gap-3">
        <Tile
          icon={<Camera className="h-6 w-6" />}
          label="Camera"
          sub="Take photo"
          onClick={() => fileRef.current?.click()}
          loading={busy === "upload"}
        />
        <Tile
          icon={<Upload className="h-6 w-6" />}
          label="Upload"
          sub="Photo / file"
          onClick={() => fileRef.current?.click()}
          loading={busy === "upload"}
        />
        <Tile
          icon={<Mic className="h-6 w-6" />}
          label="Voice note"
          sub="Coming next"
          onClick={() => setToast({ kind: "error", text: "Voice capture lands in #27b.2" })}
          disabled
        />
        <Tile
          icon={<FileText className="h-6 w-6" />}
          label="Text note"
          sub="Type or dictate"
          onClick={() => setShowNote(true)}
        />
      </section>

      {showNote && (
        <div className="rounded-xl border border-cobalt/30 bg-white/[0.02] p-3 space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            autoFocus
            placeholder="What did you see?"
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowNote(false); setNoteText(""); }} className="px-3 py-1.5 text-xs rounded-lg border border-white/10 hover:bg-white/5">
              Cancel
            </button>
            <button
              onClick={saveNote}
              disabled={busy === "note" || !noteText.trim()}
              className="px-3 py-1.5 text-xs rounded-lg bg-cobalt hover:bg-cobalt-hover disabled:opacity-50 text-white flex items-center gap-1.5"
            >
              {busy === "note" && <Loader2 className="h-3 w-3 animate-spin" />} Save note
            </button>
          </div>
        </div>
      )}

      {/* Item feed */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Captured ({items.length})
          </h2>
          {items.length > 0 && (
            <Link
              href={`/site-walk/deliverables/new?session=${sessionId}`}
              className="text-xs text-cobalt hover:text-cobalt-hover font-medium inline-flex items-center gap-1"
            >
              <FileText className="h-3 w-3" /> Build deliverable
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing yet. Take a photo or write a note above.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-100 truncate">{it.title || `(untitled ${it.item_type})`}</span>
                  <span className="text-xs text-slate-500 capitalize">{it.item_type.replace("_", " ")}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{new Date(it.captured_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadPhoto(f);
          e.target.value = "";
        }}
      />

      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg ${
          toast.kind === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

function Tile({ icon, label, sub, onClick, loading, disabled }: {
  icon: React.ReactNode; label: string; sub: string; onClick: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="aspect-square rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-cobalt/[0.06] hover:border-cobalt/30 hover:shadow-[0_0_24px_-4px_rgba(59,130,246,0.45)] transition disabled:opacity-40 disabled:hover:bg-white/[0.02] disabled:hover:border-white/10 disabled:hover:shadow-none flex flex-col items-center justify-center gap-1 text-slate-100"
    >
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-cobalt" /> : <span className="text-cobalt">{icon}</span>}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </button>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
      {icon} {label}
    </span>
  );
}
