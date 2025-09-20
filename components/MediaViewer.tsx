"use client";
import { useState } from "react";

type Props = { hero?: boolean; placeholder?: string; style?: React.CSSProperties };

export default function MediaViewer({ hero = false, placeholder = "Interactive Content Coming Soon", style }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const base = hero ? "w-[50%] max-w-[720px]" : "w-[40%] max-w-[560px]";
  // Remove Tailwind height class if style.height is provided
  const heightClass = style && style.height ? "" : (hero ? "h-[70vh]" : "h-[60vh]");
  return (
    <div
      className={`relative flex items-center justify-center ${base} ${heightClass} min-w-[320px] border-2 border-dashed rounded-2xl ${dragOver ? "border-[var(--brand-blue)] bg-slate-50" : "border-slate-300 bg-white"} shadow-md`}
      style={style}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); alert("Uploads from CEO tab."); }}
    >
      <p className="text-gray-600">{placeholder}</p>
    </div>
  );
}
