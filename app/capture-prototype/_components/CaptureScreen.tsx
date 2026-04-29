"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Undo2,
  Redo2,
  MapPin,
  Pencil,
  Paperclip,
  Plus,
} from "lucide-react";

type Stop = { id: string; name: string; img: string };
type Angle = { id: string; img: string };
type Progress = { id: string; date: string; img: string };

const STOPS: Stop[] = [
  { id: "s1", name: "Room 205", img: "/capture-prototype/room-205.jpg" },
  { id: "s2", name: "Room 206", img: "/capture-prototype/room-206.jpg" },
  { id: "s3", name: "Hallway 2W", img: "/capture-prototype/hallway.jpg" },
  { id: "s4", name: "Lobby", img: "/capture-prototype/lobby.jpg" },
  { id: "s5", name: "Room 207", img: "/capture-prototype/room-205.jpg" },
  { id: "s6", name: "Room 208", img: "/capture-prototype/room-206.jpg" },
];

const ANGLES: Angle[] = [
  { id: "a1", img: "/capture-prototype/angle-1.jpg" },
  { id: "a2", img: "/capture-prototype/angle-2.jpg" },
  { id: "a3", img: "/capture-prototype/angle-3.jpg" },
];

const PROGRESS: Progress[] = [
  { id: "p1", date: "Mar 12", img: "/capture-prototype/progress-1.jpg" },
  { id: "p2", date: "Apr 04", img: "/capture-prototype/progress-2.jpg" },
];

export function CaptureScreen() {
  const [activeStop, setActiveStop] = useState<string>(STOPS[0].id);

  return (
    <div className="dark fixed inset-0 h-[100dvh] w-full flex flex-col overflow-hidden bg-black text-white font-sans select-none">
      {/* 1. Top header bar */}
      <HeaderBar />

      {/* 2. Location / stop carousel */}
      <StopsCarousel
        stops={STOPS}
        activeStop={activeStop}
        onSelect={setActiveStop}
      />

      {/* 3. Main interactive canvas */}
      <Canvas />

      {/* 4. Angles carousel */}
      <AnglesCarousel angles={ANGLES} />

      {/* 5. Progress carousel */}
      <ProgressCarousel progress={PROGRESS} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Header
   ───────────────────────────────────────────────────────────────── */
function HeaderBar() {
  return (
    <header className="h-14 shrink-0 flex flex-row items-center px-2 gap-2 border-b border-zinc-800 bg-black">
      {/* Back */}
      <button
        type="button"
        aria-label="Back"
        className="h-10 px-2 flex items-center gap-1 rounded-lg text-zinc-200 hover:bg-zinc-900 active:bg-zinc-800 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <IconButton label="Undo">
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton label="Redo">
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>

      {/* Active project pill */}
      <button
        type="button"
        className="flex-1 min-w-0 mx-1 h-10 flex items-center justify-center gap-1 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold px-3 transition-colors shadow-[0_0_0_1px_rgba(59,130,246,0.6)]"
        aria-haspopup="listbox"
      >
        <span className="truncate">AOB Renovations 2.1</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-90" aria-hidden="true" />
      </button>

      {/* Next */}
      <button
        type="button"
        aria-label="Next"
        className="h-10 px-3 flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 text-white text-sm font-semibold transition-colors"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </header>
  );
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="h-9 w-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white active:bg-zinc-700 transition-colors"
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Stops carousel
   ───────────────────────────────────────────────────────────────── */
function StopsCarousel({
  stops,
  activeStop,
  onSelect,
}: {
  stops: Stop[];
  activeStop: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Stops"
      className="h-16 shrink-0 flex flex-row items-center overflow-x-auto overflow-y-hidden px-2 gap-2 border-b border-zinc-800 bg-black no-scrollbar"
    >
      {stops.map((stop) => {
        const isActive = stop.id === activeStop;
        return (
          <button
            key={stop.id}
            type="button"
            onClick={() => onSelect(stop.id)}
            aria-pressed={isActive}
            aria-label={`Stop: ${stop.name}`}
            className={[
              "relative h-12 w-20 shrink-0 rounded-md overflow-hidden",
              "border transition-all",
              isActive
                ? "border-blue-500 ring-2 ring-blue-500/40"
                : "border-zinc-800 hover:border-zinc-600",
            ].join(" ")}
          >
            <Image
              src={stop.img}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
            {/* Bottom dark gradient + label */}
            <span className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-end px-1.5 pb-0.5">
              <span className="text-[10px] font-semibold text-white leading-tight truncate">
                {stop.name}
              </span>
            </span>
          </button>
        );
      })}

      {/* Bleed indicator – ensures the last item visibly clips the right edge */}
      <div className="h-12 w-6 shrink-0" aria-hidden="true" />
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main canvas
   ───────────────────────────────────────────────────────────────── */
function Canvas() {
  return (
    <section
      className="relative flex-1 min-h-0 overflow-hidden bg-zinc-950"
      aria-label="Capture canvas"
    >
      {/* Sample construction photo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/capture-prototype/sample-room.jpg"
          alt="Construction site sample photo of unfinished hotel room"
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>

      {/* Hint text top-center */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 z-10">
        <span className="inline-block px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-medium text-white/80">
          Pinch to Zoom · Long-Press to Attach
        </span>
      </div>

      {/* Mock dropped pin */}
      <div
        className="absolute z-10"
        style={{ left: "62%", top: "44%" }}
        aria-label="Attachment pin"
      >
        <div className="relative -translate-x-1/2 -translate-y-full">
          <span className="absolute -inset-2 rounded-full bg-blue-500/30 blur-md animate-pulse" />
          <div className="relative h-9 w-9 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
            <MapPin className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          {/* pin point */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-blue-600" />
        </div>
      </div>

      {/* Floating bottom-left controls */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2">
        <button
          type="button"
          className="h-10 px-3 flex items-center gap-2 rounded-full bg-black/80 backdrop-blur-sm border border-white/15 text-white text-sm font-semibold hover:bg-black/95 active:bg-black transition-colors shadow-lg"
        >
          <Pencil className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <span>Start markup</span>
        </button>
        <button
          type="button"
          className="h-10 px-3 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-sm border border-white/15 text-white text-sm font-semibold hover:bg-black/95 active:bg-black transition-colors shadow-lg"
        >
          <Paperclip className="h-4 w-4 text-zinc-300" aria-hidden="true" />
          <span>Attachments</span>
          <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-blue-600 text-[11px] font-bold leading-none">
            1
          </span>
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Angles carousel
   ───────────────────────────────────────────────────────────────── */
function AnglesCarousel({ angles }: { angles: Angle[] }) {
  return (
    <section
      aria-label="Angles"
      className="h-20 shrink-0 border-t border-zinc-800 flex flex-row items-center overflow-x-auto overflow-y-hidden px-2 gap-3 bg-black no-scrollbar"
    >
      <DashedCircleButton label="Add angle">
        <Plus className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Add angle</span>
      </DashedCircleButton>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 shrink-0 -ml-1">
        Angles
      </span>

      {angles.map((angle, i) => (
        <button
          key={angle.id}
          type="button"
          aria-label={`Angle ${i + 1}`}
          className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
        >
          <Image
            src={angle.img}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        </button>
      ))}

      <div className="h-14 w-6 shrink-0" aria-hidden="true" />
    </section>
  );
}

function DashedCircleButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="h-14 w-14 shrink-0 rounded-full border-2 border-dashed border-zinc-700 hover:border-blue-500 hover:text-blue-400 text-zinc-400 flex items-center justify-center transition-colors bg-zinc-950"
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Progress carousel
   ───────────────────────────────────────────────────────────────── */
function ProgressCarousel({ progress }: { progress: Progress[] }) {
  return (
    <section
      aria-label="Progress photos"
      className="h-20 shrink-0 border-t border-zinc-800 flex flex-row items-center overflow-x-auto overflow-y-hidden px-2 gap-3 bg-black no-scrollbar"
    >
      {/* PROGRESS pill */}
      <div className="h-14 shrink-0 px-4 rounded-full bg-blue-600 text-white text-xs font-bold tracking-wider flex items-center justify-center shadow-[0_0_0_1px_rgba(59,130,246,0.6)]">
        PROGRESS
      </div>

      {/* + Add */}
      <DashedCircleButton label="Add progress photo">
        <Plus className="h-5 w-5" aria-hidden="true" />
      </DashedCircleButton>

      {progress.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-label={`Progress photo from ${p.date}`}
          className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
        >
          <Image
            src={p.img}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
          <span className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/90 to-transparent flex items-end px-1 pb-0.5">
            <span className="text-[9px] font-semibold text-white leading-none truncate">
              {p.date}
            </span>
          </span>
        </button>
      ))}

      <div className="h-14 w-6 shrink-0" aria-hidden="true" />
    </section>
  );
}
