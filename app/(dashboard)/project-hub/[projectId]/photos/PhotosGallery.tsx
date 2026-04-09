"use client";

import { FileImage, ZoomIn } from "lucide-react";
import { type PhotoFile, guessCategory } from "./_shared";

interface Props {
  mode: "grid" | "masonry";
  files: PhotoFile[];
  urlMap: Record<string, string>;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onOpenLightbox: (index: number) => void;
}

export default function PhotosGallery({ mode, files, urlMap, selectedIds, toggleSelect, onOpenLightbox }: Props) {
  if (mode === "masonry") {
    return (
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {files.map((file, idx) => {
          const url = urlMap[file.id];
          const selected = selectedIds.has(file.id);
          const category = guessCategory(file.name);
          return (
            <article key={file.id} className={`group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border transition hover:shadow-md ${selected ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20" : "border-zinc-800"}`}>
              <button onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border text-white transition ${selected ? "border-[#D4AF37] bg-[#D4AF37]" : "border-white/70 bg-black/20 opacity-0 group-hover:opacity-100"}`}>
                {selected && <span className="text-xs">✓</span>}
              </button>
              <button onClick={() => onOpenLightbox(idx)} className="block w-full text-left">
                {url ? (
                  <div className="relative overflow-hidden bg-zinc-800">
                    <img src={url} alt={file.name} className="h-auto w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                      <ZoomIn size={20} className="text-white opacity-0 transition group-hover:opacity-80" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-zinc-800 text-zinc-500"><FileImage size={24} /></div>
                )}
              </button>
              <div className="border-t border-zinc-800 bg-zinc-900 px-3 py-2">
                <p className="truncate text-sm font-semibold text-zinc-200">{file.name}</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">{file.modified ?? ""}</p>
                  <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">{category}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {files.map((file, idx) => {
        const url = urlMap[file.id];
        const selected = selectedIds.has(file.id);
        const category = guessCategory(file.name);
        return (
          <div key={file.id} className={`group relative overflow-hidden rounded-xl border transition hover:shadow-md ${selected ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20" : "border-zinc-800"}`}>
            <button onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
              className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border text-white transition ${selected ? "border-[#D4AF37] bg-[#D4AF37]" : "border-white/70 bg-black/20 opacity-0 group-hover:opacity-100"}`}>
              {selected && <span className="text-xs">✓</span>}
            </button>
            <button onClick={() => onOpenLightbox(idx)} className="block w-full">
              {url ? (
                <div className="relative aspect-square overflow-hidden bg-zinc-800">
                  <img src={url} alt={file.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                    <ZoomIn size={20} className="text-white opacity-0 transition group-hover:opacity-80" />
                  </div>
                </div>
              ) : (
                <div className="flex aspect-square items-center justify-center bg-zinc-800 text-zinc-500"><FileImage size={24} /></div>
              )}
            </button>
            <div className="bg-zinc-900 px-2.5 py-2">
              <p className="truncate text-xs font-semibold text-zinc-200">{file.name}</p>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">{file.modified ?? ""}</span>
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">{category}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
