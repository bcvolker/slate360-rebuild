"use client";

import { ChevronLeft, ChevronRight, Download, FileImage, X } from "lucide-react";
import { type PhotoFile, guessCategory, getExtension } from "./_shared";

interface Props {
  index: number;
  files: PhotoFile[];
  urlMap: Record<string, string>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function PhotosLightbox({ index, files, urlMap, onClose, onPrev, onNext }: Props) {
  const file = files[index];
  if (!file) return null;
  const url = urlMap[file.id];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between bg-black/60 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onPrev} disabled={index === 0}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-foreground disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
            <p className="text-[10px] text-gray-400">
              {index + 1} of {files.length} · {guessCategory(file.name)} · {getExtension(file)}
            </p>
          </div>
          <button onClick={onNext} disabled={index === files.length - 1}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-foreground disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { if (url) { const a = document.createElement("a"); a.href = url; a.download = file.name; a.target = "_blank"; a.click(); } }}
            className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-foreground" title="Download">
            <Download size={16} />
          </button>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-foreground">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onPrev} disabled={index === 0}
          className="absolute left-4 rounded-full bg-black/40 p-2 text-foreground/70 hover:bg-black/60 hover:text-foreground disabled:opacity-20">
          <ChevronLeft size={24} />
        </button>
        {url ? (
          <img src={url} alt={file.name} className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-card text-zinc-500">
            <FileImage size={48} />
          </div>
        )}
        <button onClick={onNext} disabled={index === files.length - 1}
          className="absolute right-4 rounded-full bg-black/40 p-2 text-foreground/70 hover:bg-black/60 hover:text-foreground disabled:opacity-20">
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}