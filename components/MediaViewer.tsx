"use client";
import { useState } from "react";

type Props = { hero?: boolean; placeholder?: string };

export default function MediaViewer({ hero = false, placeholder = "Interactive Content Coming Soon" }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const base = hero ? "w-[50%] h-[70vh] max-w-[720px]" : "w-[40%] h-[60vh] max-w-[560px]";
  return (
    <div className={`relative flex items-center justify-center ${base} min-w-[320px] border-2 border-dashed rounded-2xl ${dragOver ? "border-[var(--brand-blue)] bg-slate-50" : "border-slate-300 bg-white"} shadow-md`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); alert("Uploads from CEO tab."); }}>
      <p className="text-gray-600">{placeholder}</p>
    </div>
  );
}
