"use client";

import { useCallback, useRef, useState, type MouseEvent, type MutableRefObject, type PointerEvent, type ReactNode, type WheelEvent } from "react";
import { BookOpen, Layers, MapPin, Minus, Move, Plus, Search } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { cn } from "@/lib/utils";
import { PlanLayerToolbar, type LayerFilter } from "./PlanLayerToolbar";
import { PlanQuickActionMenu } from "./PlanQuickActionMenu";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  onCaptureRequest?: (input: "camera" | "upload") => void;
};

type Pin = {
  id: string;
  x_pct: number;
  y_pct: number;
  session_id: string;
  label: string;
  amber: boolean;
};

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };
type PlanMenu = "search" | "pages" | "layers" | null;
type QuickMenuState = { pinId?: string; xPct: number; yPct: number; screenX: number; screenY: number } | null;

const MOCK_PINS: Pin[] = [
  { id: "1", x_pct: 25.5, y_pct: 35.2, session_id: "past-1", label: "01", amber: false },
  { id: "2", x_pct: 45.1, y_pct: 60.8, session_id: "past-2", label: "02", amber: false },
  { id: "3", x_pct: 75.0, y_pct: 20.0, session_id: "past-1", label: "03", amber: false },
];

const PLAN_PAGES = ["Sheet 01", "Sheet 02", "Sheet 03"];

export function PlanViewer({ projectId, sessionId = "current-session", onCaptureRequest }: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>(MOCK_PINS);
  const [filter, setFilter] = useState<LayerFilter>("all");
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<PlanMenu>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [quickMenu, setQuickMenu] = useState<QuickMenuState>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ pointerId: number; point: Point; offset: Point; moved: boolean } | null>(null);
  const activePointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  const visiblePins = pins.filter((pin) => {
    if (filter === "none") return false;
    if (filter === "current") return pin.session_id === sessionId;
    return true;
  });

  const startPress = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY };
    activePointers.current.set(event.pointerId, point);
    dragStart.current = { pointerId: event.pointerId, point, offset: { x: transform.x, y: transform.y }, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activePointers.current.size >= 2) {
      clearPressTimer(pressTimer);
      dragStart.current = null;
      pinchStart.current = { distance: pointerDistance(activePointers.current), scale: transform.scale };
      return;
    }

    pressTimer.current = setTimeout(() => {
      const drag = dragStart.current;
      if (!drag || drag.moved) return;
      const nextPin = buildPin(point, surfaceRef.current, pins.length + 1, sessionId);
      if (!nextPin) return;
      setPins((current) => [...current, nextPin]);
      setActivePinId(nextPin.id);
      setQuickMenu({ pinId: nextPin.id, xPct: nextPin.x_pct, yPct: nextPin.y_pct, screenX: point.x, screenY: point.y });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, [pins.length, sessionId, transform.scale, transform.x, transform.y]);

  const movePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.current.size >= 2 && pinchStart.current) {
      clearPressTimer(pressTimer);
      const ratio = pointerDistance(activePointers.current) / Math.max(1, pinchStart.current.distance);
      setTransform((current) => ({ ...current, scale: clamp(pinchStart.current!.scale * ratio, 0.75, 2.5) }));
      return;
    }

    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.point.x;
    const dy = event.clientY - drag.point.y;
    if (Math.hypot(dx, dy) > 5) {
      drag.moved = true;
      clearPressTimer(pressTimer);
    }
    if (drag.moved) setTransform((current) => ({ ...current, x: drag.offset.x + dx, y: drag.offset.y + dy }));
  }, []);

  const endPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    clearPressTimer(pressTimer);
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null;
  }, []);

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setTransform((current) => ({ ...current, scale: clamp(current.scale + delta, 0.75, 2.5) }));
  }

  function zoom(delta: number) {
    setTransform((current) => ({ ...current, scale: clamp(current.scale + delta, 0.75, 2.5) }));
  }

  function handlePinClick(event: MouseEvent, pinId: string) {
    event.stopPropagation();
    setActivePinId(pinId);
    const pin = pins.find((item) => item.id === pinId);
    if (pin) setQuickMenu({ pinId, xPct: pin.x_pct, yPct: pin.y_pct, screenX: event.clientX, screenY: event.clientY });
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 z-0 touch-none overflow-hidden bg-slate-950"
        onPointerDown={startPress}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onWheel={handleWheel}
      >
        <div ref={surfaceRef} className="absolute left-1/2 top-1/2 aspect-[1.4/1] w-[150vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl" style={{ transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.scale})`, transformOrigin: "center" }}>
          <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#80808016_1px,transparent_1px),linear-gradient(to_bottom,#80808016_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute inset-0 flex items-center justify-center opacity-30 select-none pointer-events-none">
            <span className="text-4xl font-black tracking-widest text-slate-700 -rotate-45">{PLAN_PAGES[pageIndex].toUpperCase()}</span>
          </div>

          {visiblePins.map((pin) => <PlanPin key={pin.id} pin={pin} active={activePinId === pin.id} current={pin.session_id === sessionId || pin.amber} onClick={(event) => handlePinClick(event, pin.id)} />)}
        </div>
      </div>

      {/* Layer 1: plan menus */}
      <GlassCard className="absolute left-3 top-16 z-20 flex flex-col gap-2 bg-slate-950/60 p-2 backdrop-blur-xl">
        <PlanToolButton active={activeMenu === "search"} icon={<Search className="h-4 w-4" />} label="Search" onClick={() => setActiveMenu(toggleMenu(activeMenu, "search"))} />
        <PlanToolButton active={activeMenu === "pages"} icon={<BookOpen className="h-4 w-4" />} label="Pages" onClick={() => setActiveMenu(toggleMenu(activeMenu, "pages"))} />
        <PlanToolButton active={activeMenu === "layers"} icon={<Layers className="h-4 w-4" />} label="Layers" onClick={() => setActiveMenu(toggleMenu(activeMenu, "layers"))} />
      </GlassCard>

      {activeMenu && (
        <GlassCard className="absolute left-20 top-16 z-20 w-[min(20rem,calc(100vw-6rem))] bg-slate-950/75 p-3 backdrop-blur-xl">
          {activeMenu === "search" && <PlanMenuPanel title="Search" body="Search sheets, rooms, or pin labels. Search index wiring lands with real plan data." />}
          {activeMenu === "pages" && <PageSelector active={pageIndex} projectAware={Boolean(projectId)} onSelect={setPageIndex} />}
          {activeMenu === "layers" && <PlanLayerToolbar filter={filter} onChangeFilter={setFilter} pinCount={visiblePins.length} className="static left-auto top-auto z-auto w-full max-w-none translate-x-0" />}
        </GlassCard>
      )}

      {quickMenu && (
        <PlanQuickActionMenu
          pinId={quickMenu.pinId}
          planSheetId={`sheet-${pageIndex + 1}`}
          xPct={quickMenu.xPct}
          yPct={quickMenu.yPct}
          screenX={quickMenu.screenX}
          screenY={quickMenu.screenY}
          onClose={() => setQuickMenu(null)}
          onCaptureRequest={onCaptureRequest}
        />
      )}

      <GlassCard className="absolute right-3 top-16 z-20 flex items-center gap-2 bg-slate-950/60 p-2 backdrop-blur-xl">
        <button type="button" onClick={() => zoom(-0.15)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/75 hover:text-amber-100" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
        <span className="min-w-12 text-center text-[10px] font-black text-slate-300">{Math.round(transform.scale * 100)}%</span>
        <button type="button" onClick={() => zoom(0.15)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/75 hover:text-amber-100" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
      </GlassCard>

      <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2">
        <div className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 shadow-xl backdrop-blur">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300"><Move className="h-3 w-3 text-amber-500" /> Pan, zoom, or long-press to drop pin</p>
        </div>
      </div>
    </div>
  );
}

function PlanPin({ pin, active, current, onClick }: { pin: Pin; active: boolean; current: boolean; onClick: (event: MouseEvent) => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("absolute -translate-x-1/2 -translate-y-full p-2 transition-all duration-300", active ? "z-20 scale-125" : "z-10 hover:scale-110")} style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}>
      <span className="relative flex flex-col items-center">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-xl shadow-black/50", current ? "border-amber-200 bg-amber-500 text-amber-950" : "border-slate-500 bg-slate-700 text-slate-300", active && current && "ring-4 ring-amber-500/30")}>
          <span className="text-[11px] font-black">{pin.label}</span>
        </span>
        <span className={cn("h-3 w-0.5 shadow-lg", current ? "bg-amber-500" : "bg-slate-700")} />
      </span>
    </button>
  );
}

function PlanToolButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition ${active ? "bg-amber-500 text-slate-950" : "bg-white/[0.04] text-white/70 hover:text-amber-100"}`} aria-label={label}>{icon}</button>;
}

function PlanMenuPanel({ title, body }: { title: string; body: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">{title}</p><p className="mt-2 text-sm leading-6 text-slate-300">{body}</p></div>;
}

function PageSelector({ active, projectAware, onSelect }: { active: number; projectAware: boolean; onSelect: (index: number) => void }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Pages</p>
      <p className="mt-1 text-xs text-slate-500">{projectAware ? "Project plan set" : "Demo plan set"}</p>
      <div className="mt-3 grid gap-2">
        {PLAN_PAGES.map((page, index) => <button key={page} type="button" onClick={() => onSelect(index)} className={`rounded-xl border px-3 py-2 text-left text-sm font-black transition ${active === index ? "border-amber-400 bg-amber-500/15 text-amber-100" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-amber-400/50"}`}>{page}</button>)}
      </div>
    </div>
  );
}

function buildPin(point: Point, surface: HTMLDivElement | null, count: number, sessionId: string): Pin | null {
  if (!surface) return null;
  const rect = surface.getBoundingClientRect();
  const xPct = clamp(((point.x - rect.left) / rect.width) * 100, 0, 100);
  const yPct = clamp(((point.y - rect.top) / rect.height) * 100, 0, 100);
  return { id: Math.random().toString(36).slice(2), x_pct: xPct, y_pct: yPct, session_id: sessionId, label: String(count).padStart(2, "0"), amber: true };
}

function clearPressTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = null;
}

function pointerDistance(points: Map<number, Point>) {
  const [first, second] = Array.from(points.values());
  if (!first || !second) return 1;
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function toggleMenu(current: PlanMenu, next: Exclude<PlanMenu, null>): PlanMenu {
  return current === next ? null : next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}