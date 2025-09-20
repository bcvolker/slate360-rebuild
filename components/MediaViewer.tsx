"use client";
import { useState } from "react";

type Props = { hero?: boolean; placeholder?: string; style?: React.CSSProperties; alt?: boolean };

export default function MediaViewer({ hero = false, placeholder = "Interactive Content Coming Soon", style, alt = false }: Props) {
  const [dragOver, setDragOver] = useState(false);
  // Remove Tailwind width/height/max-w class if style.width/height is provided
  const widthClass = style && style.width ? "" : hero ? "w-[50%] max-w-[720px]" : "w-[40%] max-w-[560px]";
  const heightClass = style && style.height ? "" : hero ? "h-[70vh]" : "h-[60vh]";
  // Use different background/border for light (alt) vs dark tiles
  const baseClass = alt
    ? dragOver
      ? "border-[var(--brand-blue)] bg-white"
      : "border-slate-300 bg-white"
    : dragOver
      ? "border-[var(--brand-blue)] bg-[#23232a]"
      : "border-slate-700 bg-[#23232a]";
  return (
    <div
      className={`relative flex items-center justify-center ${widthClass} ${heightClass} min-w-[320px] border-2 border-dashed rounded-2xl ${baseClass} shadow-md`}
      style={style}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); alert("Uploads from CEO tab."); }}
    >
      <p className="text-gray-600">{placeholder}</p>
    </div>
  );
}
