"use client";
import { useState } from "react";

type Props = { hero?: boolean; placeholder?: string; style?: React.CSSProperties };

export default function MediaViewer({ hero = false, placeholder = "Interactive Content Coming Soon", style }: Props) {
  const [dragOver, setDragOver] = useState(false);
  // Remove Tailwind width/height class if style.width/height is provided
  const base =
    (style && style.width ? "" : hero ? "w-[50%]" : "w-[40%]") +
    (style && style.height ? "" : hero ? " h-[70vh]" : " h-[60vh]") +
    (hero ? " max-w-[720px]" : " max-w-[560px]");
  return (
    <div
      className={`relative flex items-center justify-center${base} min-w-[320px] border-2 border-dashed rounded-2xl ${dragOver ? "border-[var(--brand-blue)] bg-slate-50" : "border-slate-300 bg-white"} shadow-md`}
      style={style}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); alert("Uploads from CEO tab."); }}
    >
      <p className="text-gray-600">{placeholder}</p>
    </div>
  );
}
