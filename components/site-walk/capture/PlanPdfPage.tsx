"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

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
        <div className="mx-4 rounded-2xl border border-amber-500/40 bg-amber-500/15 p-4 text-left shadow-lg shadow-amber-950/10">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">PDF render error</p>
              <p className="mt-2 break-words text-sm font-bold leading-6 text-amber-950">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <PlanPdfErrorBoundary key={`${fileUrl}:${pageNumber}`} onError={(caughtError) => setError(reportPdfError("PDF render exception", caughtError, { fileUrl, pageNumber, label }))}>
          <Document
            file={fileUrl}
            loading={<Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
            onSourceError={(sourceError) => setError(reportPdfError("PDF source failed", sourceError, { fileUrl, pageNumber, label }))}
            onLoadError={(loadError) => setError(reportPdfError("PDF load failed", loadError, { fileUrl, pageNumber, label }))}
            onLoadSuccess={({ numPages }) => onPageCount?.(numPages)}
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={<Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
              onRenderError={(renderError) => setError(reportPdfError("PDF page render failed", renderError, { fileUrl, pageNumber, label }))}
              className="overflow-hidden bg-white [&_canvas]:!h-auto [&_canvas]:!max-w-full [&_canvas]:!bg-white"
              aria-label={label}
            />
          </Document>
        </PlanPdfErrorBoundary>
      )}
    </div>
  );
}

type PdfErrorDetails = {
  fileUrl: string;
  pageNumber: number;
  label: string;
};

function reportPdfError(prefix: string, error: unknown, details: PdfErrorDetails) {
  const message = formatPdfError(error);
  console.error(`[PlanPdfPage] ${prefix}`, { message, error, details, workerSrc: pdfjs.GlobalWorkerOptions.workerSrc });
  return `${prefix}: ${message}`;
}

function formatPdfError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown PDF error";
  }
}

class PlanPdfErrorBoundary extends Component<{ children: ReactNode; onError: (error: unknown) => void }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
