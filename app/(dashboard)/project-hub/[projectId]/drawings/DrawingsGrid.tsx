"use client";

import { Loader2, Maximize2 } from "lucide-react";
import { Document, Page } from "react-pdf";
import { type DrawingFile, guessSet } from "./_shared";

interface Props {
  files: DrawingFile[];
  urlMap: Record<string, string>;
  pageCounts: Record<string, number>;
  onSelect: (file: DrawingFile) => void;
  onPageCount: (id: string, count: number) => void;
}

export default function DrawingsGrid({ files, urlMap, pageCounts, onSelect, onPageCount }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {files.map((file) => {
        const url = urlMap[file.id];
        const set = guessSet(file.name);
        const pages = pageCounts[file.id];
        return (
          <button key={file.id} onClick={() => onSelect(file)} className="group overflow-hidden rounded-2xl border border-zinc-800 bg-card text-left shadow-sm transition hover:border-zinc-600 hover:shadow-md">
            <div className="relative flex h-[220px] items-center justify-center bg-card/50">
              {url ? (
                <Document file={url} loading={<Loader2 size={16} className="animate-spin text-zinc-500" />} onLoadSuccess={({ numPages }) => onPageCount(file.id, numPages)}>
                  <Page pageNumber={1} width={260} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
              ) : (
                <p className="text-sm text-zinc-500">Preview unavailable</p>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                <Maximize2 size={20} className="text-foreground opacity-0 transition group-hover:opacity-80" />
              </div>
            </div>
            <div className="border-t border-zinc-800 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-200">{file.name}</p>
                  <p className="text-xs text-zinc-500">{file.modified ?? ""}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">{set}</span>
                  {pages && <span className="text-[10px] text-zinc-500">{pages} pg{pages !== 1 ? "s" : ""}</span>}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
