"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, MapPin, Loader2, Trash2, Plus } from "lucide-react";

type Plan = {
  id: string;
  title: string;
  s3_key: string;
  width: number;
  height: number;
};

type Pin = {
  id: string;
  plan_id: string;
  item_id: string;
  x_pct: number;
  y_pct: number;
  pin_number: number | null;
  pin_color: string;
};

type Item = { id: string; title: string; item_type: string };

export default function PlansClient({ sessionId, items }: { sessionId: string; items: Item[] }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadPlans(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activePlan) { setPins([]); setPlanUrl(null); return; }
    void loadPins(activePlan.id);
    // The /image endpoint returns a 307 redirect to a signed S3 URL.
    // Browsers follow redirects in <img> automatically.
    setPlanUrl(`/api/site-walk/plans/${activePlan.id}/image`);
  }, [activePlan]);

  async function loadPlans() {
    const r = await fetch(`/api/site-walk/plans?session_id=${sessionId}`);
    const j = await r.json();
    const list: Plan[] = j.plans ?? [];
    setPlans(list);
    if (list.length > 0 && !activePlan) setActivePlan(list[0]);
  }

  async function loadPins(planId: string) {
    const r = await fetch(`/api/site-walk/pins?plan_id=${planId}`);
    const j = await r.json();
    setPins(j.pins ?? []);
  }

  async function uploadPlan(file: File) {
    setBusy(true);
    setError(null);
    try {
      const presign = await fetch("/api/site-walk/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "image/png", sessionId }),
      });
      const pj = await presign.json();
      if (!presign.ok || !pj.uploadUrl) {
        setError(pj.error ?? "Upload preflight failed");
        return;
      }
      const put = await fetch(pj.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/png" } });
      if (!put.ok) {
        setError(`S3 upload failed (${put.status})`);
        return;
      }
      const create = await fetch("/api/site-walk/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          title: file.name.replace(/\.[^.]+$/, ""),
          s3_key: pj.s3Key,
          file_id: pj.fileId,
        }),
      });
      const cj = await create.json();
      if (!create.ok) {
        setError(cj.error ?? "Save failed");
        return;
      }
      await loadPlans();
      setActivePlan(cj.plan);
    } finally {
      setBusy(false);
    }
  }

  async function placePin(e: React.MouseEvent<HTMLDivElement>) {
    if (!activePlan || !pendingItem) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x_pct = ((e.clientX - rect.left) / rect.width) * 100;
    const y_pct = ((e.clientY - rect.top) / rect.height) * 100;

    const res = await fetch("/api/site-walk/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: activePlan.id,
        item_id: pendingItem,
        x_pct: Math.round(x_pct * 100) / 100,
        y_pct: Math.round(y_pct * 100) / 100,
        pin_number: pins.length + 1,
        pin_color: "blue",
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error ?? "Pin failed");
      return;
    }
    setPendingItem("");
    await loadPins(activePlan.id);
  }

  async function deletePin(pinId: string) {
    if (!activePlan) return;
    await fetch(`/api/site-walk/pins/${pinId}`, { method: "DELETE" });
    await loadPins(activePlan.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-cobalt hover:bg-cobalt-hover disabled:opacity-50 text-primary-foreground"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload plan
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadPlan(f);
            e.target.value = "";
          }}
        />
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePlan(p)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${
              activePlan?.id === p.id
                ? "bg-cobalt/15 border-cobalt/40 text-cobalt"
                : "border-white/10 hover:border-cobalt/30 text-slate-300"
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!activePlan ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-500" />
          <p className="text-sm text-slate-400">Upload a floor plan to start pinning items.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Pin item:</span>
            <select
              value={pendingItem}
              onChange={(e) => setPendingItem(e.target.value)}
              className="px-2 py-1 rounded bg-slate-900 border border-white/10"
            >
              <option value="">Pick an item…</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>{it.title || it.item_type}</option>
              ))}
            </select>
            {pendingItem && <span className="text-cobalt"><Plus className="inline h-3 w-3" /> Click on the plan to place</span>}
          </div>

          <div
            onClick={placePin}
            className={`relative w-full rounded-xl overflow-hidden border border-white/10 bg-slate-950 ${
              pendingItem ? "cursor-crosshair" : ""
            }`}
            style={{ aspectRatio: "4 / 3" }}
          >
            {planUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={planUrl} alt={activePlan.title} className="w-full h-full object-contain pointer-events-none" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                Loading plan…
              </div>
            )}
            {pins.map((pin) => (
              <button
                key={pin.id}
                onClick={(e) => { e.stopPropagation(); void deletePin(pin.id); }}
                title="Click to remove pin"
                className="absolute -translate-x-1/2 -translate-y-full hover:scale-110 transition"
                style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}
              >
                <span className="block w-6 h-6 rounded-full bg-cobalt border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  {pin.pin_number ?? "•"}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Click a pin to remove it.
          </p>
        </div>
      )}
    </div>
  );
}
