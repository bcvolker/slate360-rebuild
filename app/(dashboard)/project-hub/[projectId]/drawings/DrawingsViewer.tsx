"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, Minimize2, Pin, Ruler, X, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page } from "react-pdf";
import { type DrawingFile, guessSet } from "./_shared";

interface Props {
  file: DrawingFile;
  url: string | null;
  filteredFiles: DrawingFile[];
  pageCounts: Record<string, number>;
  onClose: () => void;
  onSelectFile: (file: DrawingFile) => void;
  onPageCount: (id: string, count: number) => void;
}

export default function DrawingsViewer({ file, url, filteredFiles, pageCounts, onClose, onSelectFile, onPageCount }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(pageCounts[file.id] ?? 1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const idx = filteredFiles.findIndex((f) => f.id === file.id);
  const viewerWidth = useMemo(() => Math.round((isFullscreen ? 1200 : 900) * (zoom / 100)), [zoom, isFullscreen]);

  const handlePrevFile = () => { if (idx > 0) onSelectFile(filteredFiles[idx - 1]); };
  const handleNextFile = () => { if (idx < filteredFiles.length - 1) onSelectFile(filteredFiles[idx + 1]); };
  const handleDownload = () => { if (!url) return; const a = document.createElement("a"); a.href = url; a.download = file.name; a.target = "_blank"; a.click(); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
      {/* Title bar */}
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handlePrevFile} disabled={idx === 0} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{file.name}</p>
            <p className="text-[10px] text-gray-400">{idx + 1} of {filteredFiles.length} · {guessSet(file.name)}</p>
          </div>
          <button onClick={handleNextFile} disabled={idx === filteredFiles.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleDownload} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title="Download"><Download size={16} /></button>
          <button onClick={() => setIsFullscreen((f) => !f)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title="Toggle fullscreen">{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          <button onClick={() => { onClose(); setIsFullscreen(false); }} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title="Close"><X size={18} /></button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-1.5">
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-600"><Pin size={12} /> Pin</button>
          <button className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-600"><Ruler size={12} /> Measure</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage <= 1} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-xs font-semibold text-gray-300">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom((z) => Math.max(z - 25, 25))} disabled={zoom <= 25} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"><ZoomOut size={16} /></button>
          <span className="min-w-[3rem] text-center text-xs font-semibold text-gray-300">{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 25, 300))} disabled={zoom >= 300} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"><ZoomIn size={16} /></button>
          <button onClick={() => setZoom(100)} className="ml-1 rounded-md border border-gray-600 px-2 py-0.5 text-[10px] font-semibold text-gray-400 hover:bg-gray-700">Reset</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-gray-900 p-4">
        <div className="mx-auto w-fit rounded-lg bg-white p-2 shadow-lg">
          {url ? (
            <Document file={url} loading={<div className="flex h-96 items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-400" /></div>} onLoadSuccess={({ numPages }) => { setTotalPages(numPages); onPageCount(file.id, numPages); }}>
              <Page pageNumber={currentPage} width={viewerWidth} />
            </Document>
          ) : (
            <div className="flex h-96 items-center justify-center"><p className="text-sm text-gray-500">Viewer unavailable for this file.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
