"use client";

import { Component, memo, useEffect, useState, type ReactNode } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { PLAN_PDF_BASE_WIDTH } from "./planViewerModel";
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
  onPdfPageRendered?: (details: PlanPdfRenderDetails) => void;
};

export type PlanPdfRenderDetails = {
  fileUrl: string;
  pageNumber: number;
  pageWidth: number;
};

function PlanPdfPageComponent({ fileUrl, pageNumber, label, compact = false, maxWidth = PLAN_PDF_BASE_WIDTH, minWidth = 240, onPageCount, onPdfPageRendered }: Props) {
  const [error, setError] = useState<string | null>(null);
  const pageWidth = compact ? Math.max(minWidth, Math.min(maxWidth, PLAN_PDF_BASE_WIDTH)) : PLAN_PDF_BASE_WIDTH;

  useEffect(() => {
    setError(null);
  }, [fileUrl, pageNumber]);

  return (
    <div className="flex h-full w-full touch-none select-none items-center justify-center overflow-hidden bg-white text-slate-900" style={{ WebkitTouchCallout: "none" }}>
      {error ? (
        <div className="mx-4 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-left shadow-lg">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-0.5 h-6 w-6 shrink-0 text-slate-500" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">PDF render error</p>
              <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-800">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <PlanPdfErrorBoundary key={fileUrl} onError={(caughtError) => setError(reportPdfError("PDF render exception", caughtError, { fileUrl, pageNumber, label }))}>
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
                onRenderSuccess={() => onPdfPageRendered?.({ fileUrl, pageNumber, pageWidth })}
                className="overflow-hidden bg-white [&_canvas]:!h-auto [&_canvas]:!max-w-full [&_canvas]:!bg-white"
                aria-label={label}
              />
            </Document>
          </PlanPdfErrorBoundary>
        </div>
      )}
    </div>
  );
}

export const PlanPdfPage = memo(PlanPdfPageComponent, (previous, next) => previous.fileUrl === next.fileUrl && previous.pageNumber === next.pageNumber && previous.label === next.label && previous.compact === next.compact && previous.maxWidth === next.maxWidth && previous.minWidth === next.minWidth);

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
