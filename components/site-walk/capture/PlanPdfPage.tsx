"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

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
    setError(null);
  }, [fileUrl, pageNumber]);

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
        <PlanPdfErrorBoundary key={`${fileUrl}:${pageNumber}`} onError={() => setError("This PDF renderer hit a browser error. Refresh and try again; the uploaded file is still saved.")}>
          <Document
            file={fileUrl}
            loading={<Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
            onLoadError={() => setError("This PDF could not be rendered in the browser. Open the file separately or try re-uploading if it was exported with restricted PDF settings.")}
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
        </PlanPdfErrorBoundary>
      )}
    </div>
  );
}

class PlanPdfErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Plan PDF renderer failed", error);
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
