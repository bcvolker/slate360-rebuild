/**
 * ShareViewer — client component that renders shared files inline.
 * Handles PDFs, images, videos, and generic download.
 */
"use client";

import { Download, ExternalLink, Eye, Lock } from "lucide-react";
import {
  ExternalPortalShell,
  PortalGlassCard,
  PortalPrimaryLink,
  PortalSecondaryLink,
} from "@/components/external-portal";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ShareViewer({
  fileName,
  fileType,
  fileSize,
  presignedUrl,
  canDownload,
}: {
  fileName: string;
  fileType: string;
  fileSize: number;
  presignedUrl: string;
  canDownload: boolean;
}) {
  const isPdf = fileType.includes("pdf");
  const isImage =
    fileType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileName);
  const isVideo =
    fileType.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(fileName);

  const headerActions = (
    <>
      {canDownload ? (
        <PortalPrimaryLink href={presignedUrl} download={fileName}>
          <Download size={14} aria-hidden />
          Download
        </PortalPrimaryLink>
      ) : null}
      <PortalSecondaryLink
        href={presignedUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={14} aria-hidden />
        Open
      </PortalSecondaryLink>
    </>
  );

  return (
    <ExternalPortalShell
      portalLabel="Shared file"
      title={fileName}
      subtitle={
        canDownload
          ? `${formatBytes(fileSize)} · View and download`
          : `${formatBytes(fileSize)} · View only`
      }
      headerActions={headerActions}
      showFooter
    >
      <main className="flex flex-1 flex-col overflow-auto p-4 sm:p-6">
        {!canDownload ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-[var(--graphite-muted)]">
            <Lock size={14} className="shrink-0 text-[var(--graphite-muted)]" aria-hidden />
            <span>Download is not permitted for this link. You can view or open the file only.</span>
          </div>
        ) : null}
        {isPdf ? (
          <PortalGlassCard className="flex flex-1 flex-col overflow-hidden !p-0">
            <iframe
              src={presignedUrl}
              className="min-h-[calc(100vh-11rem)] w-full flex-1 rounded-xl bg-[#0f141c]"
              title={fileName}
            />
          </PortalGlassCard>
        ) : null}

        {isImage ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={presignedUrl}
              alt={fileName}
              className="max-h-[calc(100vh-11rem)] max-w-full rounded-2xl border border-white/10 object-contain shadow-lg"
            />
          </div>
        ) : null}

        {isVideo ? (
          <video
            src={presignedUrl}
            controls
            className="mx-auto max-h-[calc(100vh-11rem)] w-full max-w-4xl rounded-2xl border border-white/10 bg-black"
          />
        ) : null}

        {!isPdf && !isImage && !isVideo ? (
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
            <PortalGlassCard className="w-full text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Eye size={28} className="text-slate-400" aria-hidden />
              </div>
              <h2 className="text-lg font-bold text-white">{fileName}</h2>
              <p className="mt-1 text-sm text-slate-400">{formatBytes(fileSize)}</p>
              <p className="mt-3 text-xs text-slate-500">
                Preview is not available for this file type.
                {canDownload ? " Download the file to open it locally." : " Open in a new tab if your device supports this format."}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {canDownload ? (
                  <PortalPrimaryLink href={presignedUrl} download={fileName}>
                    <Download size={15} aria-hidden />
                    Download file
                  </PortalPrimaryLink>
                ) : (
                  <PortalSecondaryLink
                    href={presignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} aria-hidden />
                    Open file
                  </PortalSecondaryLink>
                )}
              </div>
            </PortalGlassCard>
          </div>
        ) : null}
      </main>
    </ExternalPortalShell>
  );
}
