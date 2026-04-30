"use client";

import type { MarkupShape } from "@/lib/site-walk/markup-types";

const WIDTH = 1000;
const HEIGHT = 720;

type SelectionMenuProps = {
  onDelete: () => void;
  onBigger: () => void;
  onSmaller: () => void;
};

export function SelectionMenu({ onDelete, onBigger, onSmaller }: SelectionMenuProps) {
  return <div className="absolute left-3 top-3 z-20 flex gap-2 rounded-full border border-white/15 bg-black/60 p-1 text-xs font-black text-white backdrop-blur-xl"><button type="button" onClick={onSmaller} className="rounded-full bg-white/10 px-3 py-2">−</button><button type="button" onClick={onBigger} className="rounded-full bg-white/10 px-3 py-2">+</button><button type="button" onClick={onDelete} className="rounded-full bg-rose-500 px-3 py-2">Delete</button></div>;
}

export function TextEditor({ shape, onChange, onDone }: { shape?: MarkupShape; onChange: (value: string) => void; onDone: () => void }) {
  if (!shape || shape.kind !== "text") return null;
  return <input autoFocus value={shape.text} onChange={(event) => onChange(event.target.value)} onBlur={onDone} onKeyDown={(event) => { if (event.key === "Enter") onDone(); }} className="absolute z-30 min-w-40 rounded-2xl border border-blue-500 bg-black/75 px-3 py-2 text-base font-black text-white outline-none backdrop-blur-xl" style={{ left: `${(shape.x / WIDTH) * 100}%`, top: `${(shape.y / HEIGHT) * 100}%` }} placeholder="Type note" />;
}