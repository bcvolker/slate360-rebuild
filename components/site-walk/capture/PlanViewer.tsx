"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Loader2, MapPinned, Minus, Plus } from "lucide-react";
import type { MarkupData, MarkupShape } from "@/lib/site-walk/markup-types";
import { createAnnotationItem } from "@/lib/site-walk/capture-item-client";
import { captureMetadata } from "@/lib/site-walk/metadata";
import { queueOfflineCapture } from "@/lib/site-walk/offline-capture";
import { publishCaptureItemFocus } from "./capture-item-events";
import { PlanQuickActionMenu } from "./PlanQuickActionMenu";
import { VECTOR_TOOL_EVENT, type VectorTool } from "./UnifiedVectorToolbar";

type Props = { projectId: string | null; sessionId: string };
type PlanSheet = { id: string; sheet_name: string | null; image_s3_key?: string | null; thumbnail_s3_key?: string | null };
type Pin = { id: string; x_pct: number; y_pct: number; label: string | null; pin_status: string | null; markup_data?: MarkupData | Record<string, never> | null };
type PlanSetResponse = { sheets?: PlanSheet[]; error?: string };
type PinResponse = { pins?: Pin[]; pin?: Pin; error?: string };
type MenuState = { pinId?: string; xPct: number; yPct: number; screenX: number; screenY: number };
type Transform = { x: number; y: number; scale: number };

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 720;

export function PlanViewer({ projectId, sessionId }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<number | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; origin: Transform } | null>(null);
  const [sheets, setSheets] = useState<PlanSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState("");
  const [pins, setPins] = useState<Pin[]>([]);
  const [tool, setTool] = useState<VectorTool>("select");
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Long-press the plan to drop a draft pin.");

  const activeSheet = useMemo(() => sheets.find((sheet) => sheet.id === activeSheetId) ?? null, [activeSheetId, sheets]);
  const markupShapes = useMemo(() => pins.flatMap((pin) => isMarkupData(pin.markup_data) ? pin.markup_data.shapes : []), [pins]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    function handleTool(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const nextTool = typeof detail?.tool === "string" ? detail.tool : "select";
      if (["select", "draw", "box", "circle", "arrow", "text"].includes(nextTool)) setTool(nextTool as VectorTool);
    }
    window.addEventListener(VECTOR_TOOL_EVENT, handleTool);
    return () => window.removeEventListener(VECTOR_TOOL_EVENT, handleTool);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !projectId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/site-walk/plan-sets?project_id=${encodeURIComponent(projectId)}`)
      .then((response) => response.json() as Promise<PlanSetResponse>)
      .then((data) => {
        if (cancelled) return;
        const nextSheets = data.sheets ?? [];
        setSheets(nextSheets);
        setActiveSheetId((current) => current || nextSheets[0]?.id || "");
      })
      .catch(() => setMessage("Plan sheets could not be loaded."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, projectId]);

  useEffect(() => {
    if (!activeSheetId) return;
    fetch(`/api/site-walk/pins?plan_sheet_id=${encodeURIComponent(activeSheetId)}`)
      .then((response) => response.json() as Promise<PinResponse>)
      .then((data) => setPins(data.pins ?? []))
      .catch(() => setMessage("Pins could not be loaded."));
  }, [activeSheetId]);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current);
    longPressRef.current = null;
  }, []);

  function toPlanPoint(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { xPct: 50, yPct: 50, screenX: 20, screenY: 20 };
    const localX = (clientX - rect.left - transform.x) / transform.scale;
    const localY = (clientY - rect.top - transform.y) / transform.scale;
    return {
      xPct: clamp((localX / CANVAS_WIDTH) * 100, 0, 100),
      yPct: clamp((localY / CANVAS_HEIGHT) * 100, 0, 100),
      screenX: clientX - rect.left + 12,
      screenY: clientY - rect.top + 12,
    };
  }

  async function createDraftPin(point: { xPct: number; yPct: number; screenX: number; screenY: number }, markup?: MarkupData) {
    if (!activeSheetId) return;
    setMessage(markup ? "Saving markup JSON…" : "Saving draft pin…");
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(12);
    const metadata = { captured_from: "prompt_8_plan_pin", plan_sheet_id: activeSheetId, x_pct: point.xPct, y_pct: point.yPct, markup_data: markup ?? null };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const base = await captureMetadata();
      const local = await queueOfflineCapture({ sessionId, itemType: "annotation", title: markup ? "Plan markup" : "Plan pin", description: "", metadata: { ...base, ...metadata }, captureMode: "plan_pin", planTarget: { planSheetId: activeSheetId, xPct: point.xPct, yPct: point.yPct } });
      publishCaptureItemFocus({ item: local, reason: "pin" });
      setMessage("Working offline — pin saved locally and queued.");
      return;
    }

    const item = await createAnnotationItem(sessionId, markup ? "Plan markup" : "Plan pin", metadata);
    const response = await fetch("/api/site-walk/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_sheet_id: activeSheetId,
        project_id: projectId,
        session_id: sessionId,
        item_id: item.id,
        x_pct: point.xPct,
        y_pct: point.yPct,
        pin_status: "active",
        pin_color: "blue",
        label: markup ? "Markup" : "Draft pin",
        markup_data: markup,
      }),
    });
    const data = (await response.json().catch(() => null)) as PinResponse | null;
    if (!response.ok || !data?.pin) {
      setMessage(data?.error ?? "Could not save the plan pin.");
      return;
    }
    setPins((current) => [...current, data.pin as Pin]);
    publishCaptureItemFocus({ item, reason: "pin" });
    setMenu(markup ? null : { pinId: data.pin.id, ...point });
    setMessage(markup ? "Markup item saved. Add details in the drawer." : "Pin item saved. Add details or attach a photo next.");
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      clearLongPress();
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: distance(a, b), scale: transform.scale };
      return;
    }
    dragRef.current = { x: event.clientX, y: event.clientY, origin: transform };
    longPressRef.current = window.setTimeout(() => {
      const point = toPlanPoint(event.clientX, event.clientY);
      const markup = tool === "select" ? undefined : buildMarkup(tool, point);
      void createDraftPin(point, markup);
    }, 650);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointersRef.current.get(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!previous) return;
    if (Math.abs(event.clientX - previous.x) + Math.abs(event.clientY - previous.y) > 6) clearLongPress();
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const nextScale = clamp((distance(a, b) / pinchRef.current.distance) * pinchRef.current.scale, 0.6, 3);
      setTransform((current) => ({ ...current, scale: nextScale }));
      return;
    }
    if (dragRef.current && tool === "select") {
      setTransform({ ...dragRef.current.origin, x: dragRef.current.origin.x + event.clientX - dragRef.current.x, y: dragRef.current.origin.y + event.clientY - dragRef.current.y });
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    clearLongPress();
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragRef.current = null;
  }

  if (!mounted) return <PlanPlaceholder title="Loading plan tools…" loading />;
  if (!projectId) return <PlanPlaceholder title="Photos-only walk" text="No floor plan is required. Continue capturing photos and notes." />;
  if (loading) return <PlanPlaceholder title="Loading plan sheets…" loading />;
  if (!activeSheet) return <PlanPlaceholder title="No plan sheets yet" text="Upload plans in the Master Plan Room, then return here to drop pins and markup." />;

  const hasImage = !!(activeSheet.image_s3_key || activeSheet.thumbnail_s3_key);
  return (
    <section className="min-h-[480px] rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">Plan canvas</h2>
          <p className="text-xs font-bold text-slate-600">{message}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={activeSheetId} onChange={(event) => setActiveSheetId(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900">
            {sheets.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.sheet_name ?? "Plan sheet"}</option>)}
          </select>
          <button type="button" onClick={() => setTransform((current) => ({ ...current, scale: clamp(current.scale - 0.2, 0.6, 3) }))} className="min-h-11 rounded-xl border border-slate-300 px-3"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={() => setTransform((current) => ({ ...current, scale: clamp(current.scale + 0.2, 0.6, 3) }))} className="min-h-11 rounded-xl border border-slate-300 px-3"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={stageRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className="relative h-[420px] touch-none overflow-hidden rounded-2xl border border-slate-300 bg-slate-100">
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
          {hasImage ? <img src={`/api/site-walk/plan-sheets/${activeSheet.id}/image`} alt={activeSheet.sheet_name ?? "Plan sheet"} className="h-full w-full select-none object-contain" draggable={false} /> : <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(90deg,#cbd5e1_1px,transparent_1px),linear-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:40px_40px] text-center"><div><MapPinned className="mx-auto h-10 w-10 text-blue-800" /><p className="mt-3 font-black text-slate-900">{activeSheet.sheet_name ?? "Plan sheet"}</p><p className="text-sm text-slate-600">Image extraction pending. Pins still save against this sheet.</p></div></div>}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
            {markupShapes.map((shape) => renderShape(shape))}
          </svg>
          {pins.map((pin) => <button key={pin.id} type="button" onClick={(event) => { event.stopPropagation(); setMenu({ pinId: pin.id, xPct: pin.x_pct, yPct: pin.y_pct, screenX: (pin.x_pct / 100) * CANVAS_WIDTH * transform.scale + transform.x + 12, screenY: (pin.y_pct / 100) * CANVAS_HEIGHT * transform.scale + transform.y + 12 }); }} className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-black text-white shadow" style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}>{pin.pin_status === "draft" ? "D" : "✓"}</button>)}
        </div>
        {menu && <PlanQuickActionMenu planSheetId={activeSheet.id} {...menu} onClose={() => setMenu(null)} />}
        <div className="absolute right-4 top-4 rounded-full border border-blue-200 bg-blue-50 p-2 text-blue-800"><Crosshair className="h-4 w-4" /></div>
      </div>
    </section>
  );
}

function PlanPlaceholder({ title, text, loading = false }: { title: string; text?: string; loading?: boolean }) {
  return <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm"><div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 p-6 text-center">{loading ? <Loader2 className="h-8 w-8 animate-spin text-blue-800" /> : <MapPinned className="h-10 w-10 text-blue-800" />}<h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2>{text && <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{text}</p>}</div></section>;
}

function buildMarkup(tool: VectorTool, point: { xPct: number; yPct: number }): MarkupData {
  const x = (point.xPct / 100) * CANVAS_WIDTH;
  const y = (point.yPct / 100) * CANVAS_HEIGHT;
  const base = { id: `markup-${Date.now()}`, stroke: "#2563eb", fill: "none", strokeWidth: 4, rotation: 0, updatedAt: Date.now() };
  const shape: MarkupShape = tool === "box" ? { ...base, kind: "rect", x: x - 50, y: y - 35, width: 100, height: 70 } : tool === "circle" ? { ...base, kind: "ellipse", cx: x, cy: y, rx: 48, ry: 34 } : tool === "arrow" ? { ...base, kind: "arrow", x1: x - 60, y1: y - 30, x2: x + 60, y2: y + 30, headSize: 24 } : tool === "text" ? { ...base, kind: "text", x, y, text: "Note", fontSize: 32 } : { ...base, kind: "freehand", points: [x - 40, y, x - 10, y - 25, x + 30, y + 18] };
  return { version: 1, coordSpace: "image", shapes: [shape] };
}

function renderShape(shape: MarkupShape) {
  if (shape.kind === "rect") return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  if (shape.kind === "ellipse") return <ellipse key={shape.id} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  if (shape.kind === "arrow") return <ArrowShape key={shape.id} shape={shape} />;
  if (shape.kind === "text") return <text key={shape.id} x={shape.x} y={shape.y} fill={shape.stroke} fontSize={shape.fontSize} fontWeight={800}>{shape.text}</text>;
  if (shape.kind === "freehand") return <polyline key={shape.id} points={shape.points.join(" ")} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  return null;
}

function ArrowShape({ shape }: { shape: Extract<MarkupShape, { kind: "arrow" }> }) {
  const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
  const left = `${shape.x2 - shape.headSize * Math.cos(angle - Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle - Math.PI / 6)}`;
  const right = `${shape.x2 - shape.headSize * Math.cos(angle + Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle + Math.PI / 6)}`;
  return <g><line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" /><polyline points={`${left} ${shape.x2},${shape.y2} ${right}`} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></g>;
}

function isMarkupData(value: unknown): value is MarkupData {
  return !!value && typeof value === "object" && (value as { version?: unknown }).version === 1 && Array.isArray((value as { shapes?: unknown }).shapes);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
