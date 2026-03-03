/**
 * ShareViewer — client component that renders shared files inline.
 * Handles PDFs, images, videos, and generic download.
 */
"use client";

import { useState } from "react";
import { Download, FileText, ExternalLink, Eye } from "lucide-react";

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
  const [loaded, setLoaded] = useState(false);

  const isPdf = fileType.includes("pdf");
  const isImage = fileType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileName);
  const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(fileName);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#FF4D00]/10 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-[#FF4D00]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">{fileName}</h1>
            <p className="text-[10px] text-gray-400">{formatBytes(fileSize)} · Shared via Slate360</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canDownload && (
            <a
              href={presignedUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#FF4D00" }}
            >
              <Download size={13} /> Download
            </a>
          )}
          <a
            href={presignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <ExternalLink size={13} /> Open
          </a>
        </div>
      </header>

      {/* File preview */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {isPdf && (
          <iframe
            src={presignedUrl}
            className="w-full max-w-5xl rounded-xl border border-gray-200 shadow-lg bg-white"
            style={{ height: "calc(100vh - 120px)" }}
            title={fileName}
            onLoad={() => setLoaded(true)}
          />
        )}
        {isImage && (
          <div className="flex flex-col items-center gap-4 max-w-4xl w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={presignedUrl}
              alt={fileName}
              className="max-w-full max-h-[calc(100vh-160px)] rounded-xl border border-gray-200 shadow-lg object-contain bg-white"
              onLoad={() => setLoaded(true)}
            />
          </div>
        )}
        {isVideo && (
          <video
            src={presignedUrl}
            controls
            className="max-w-4xl w-full rounded-xl border border-gray-200 shadow-lg bg-black"
            style={{ maxHeight: "calc(100vh - 140px)" }}
            onLoadedData={() => setLoaded(true)}
          />
        )}
        {!isPdf && !isImage && !isVideo && (
          <div className="text-center space-y-4 py-16">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              <Eye size={32} className="text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">{fileName}</h2>
              <p className="text-sm text-gray-500">{formatBytes(fileSize)}</p>
            </div>
            <p className="text-xs text-gray-400">
              Preview not available for this file type.
              {canDownload && " Download the file to view it."}
            </p>
            {canDownload && (
              <a
                href={presignedUrl}
                download={fileName}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#FF4D00" }}
              >
                <Download size={15} /> Download File
              </a>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-2 text-center">
        <p className="text-[10px] text-gray-400">
          Powered by <span className="font-bold text-gray-600">Slate360</span> · Secure file sharing
        </p>
      </footer>
    </div>
  );
}
