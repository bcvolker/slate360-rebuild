"use client";

import { useEffect, useRef, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  fileUrl: string;
  pageNumber: number;
  label: string;
  compact?: boolean;
  maxWidth?: number;
  minWidth?: number;
  onPageCount?: (count: number) => void;
};

export function PlanPdfPage({ fileUrl, pageNumber, label, compact = false, maxWidth = 980, minWidth = 240, onPageCount }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(minWidth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    function updateWidth() {
      const padding = compact ? 0 : 24;
      const nextWidth = Math.floor((shell?.clientWidth ?? minWidth) - padding);
      setPageWidth(Math.max(minWidth, Math.min(maxWidth, nextWidth)));
    }

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [compact, maxWidth, minWidth]);

  return (
    <div ref={shellRef} className="flex h-full w-full items-center justify-center overflow-hidden bg-white text-slate-900">
      {error ? (
        <div className="flex flex-col items-center gap-2 px-4 text-center text-sm font-bold text-slate-600">
          <FileWarning className="h-7 w-7 text-amber-500" />
          <span>{error}</span>
        </div>
      ) : (
        <Document
          file={fileUrl}
          loading={<Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
          onLoadError={() => setError("This PDF could not be rendered. Download and re-upload if it came from a locked or damaged source.")}
          onLoadSuccess={({ numPages }) => onPageCount?.(numPages)}
        >
          <Page
            pageNumber={pageNumber}
            width={pageWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={<Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
            className="overflow-hidden bg-white [&_canvas]:!h-auto [&_canvas]:!max-w-full [&_canvas]:!bg-white"
            aria-label={label}
          />
        </Document>
      )}
    </div>
  );
}
