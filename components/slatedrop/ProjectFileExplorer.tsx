"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Folder, FileText, Link as LinkIcon, Check, ArrowUpRight, Download } from "lucide-react";

type FolderRow = {
  id: string;
  name: string;
  path: string;
};

type FileRow = {
  id: string;
  name: string;
  size: number;
  type: string;
  modified: string;
};

type LatestReport = {
  id: string;
  name: string;
  url: string | null;
};

export default function ProjectFileExplorer({
  projectId,
  rootFolderId,
}: {
  projectId: string;
  rootFolderId: string;
}) {
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isExportingCloseout, setIsExportingCloseout] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [latestReport, setLatestReport] = useState<LatestReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadFolders = async () => {
      setFoldersLoading(true);
      try {
        const response = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(rootFolderId)}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        const folderRows = Array.isArray(payload?.folders) ? payload.folders : [];
        setFolders(folderRows);
        setActiveFolderId(folderRows[0]?.id ?? null);
      } finally {
        if (!cancelled) setFoldersLoading(false);
      }
    };

    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, [projectId, rootFolderId]);

  useEffect(() => {
    if (!activeFolderId) {
      setFiles([]);
      setGeneratedLink(null);
      setCopied(false);
      return;
    }

    setGeneratedLink(null);
    setCopied(false);
    let cancelled = false;

    const loadFiles = async () => {
      setFilesLoading(true);
      try {
        const response = await fetch(`/api/slatedrop/files?folderId=${encodeURIComponent(activeFolderId)}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        setFiles(Array.isArray(payload?.files) ? payload.files : []);
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    };

    void loadFiles();

    return () => {
      cancelled = true;
    };
  }, [activeFolderId]);

  const activeFolder = useMemo(() => folders.find((folder) => folder.id === activeFolderId) ?? null, [folders, activeFolderId]);
  const activeFolderIsReports = (activeFolder?.name ?? "").toLowerCase() === "reports";

  useEffect(() => {
    if (!activeFolderIsReports || files.length === 0) {
      setLatestReport(null);
      setReportLoading(false);
      setReportCopied(false);
      return;
    }

    const candidates = files.filter((file) => {
      const lower = file.name.toLowerCase();
      return lower.endsWith(".pdf") && lower.includes("photo-report");
    });

    if (candidates.length === 0) {
      setLatestReport(null);
      setReportLoading(false);
      setReportCopied(false);
      return;
    }

    let cancelled = false;
    const latest = candidates[0];

    const loadLatestReportUrl = async () => {
      setReportLoading(true);
      try {
        const response = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(latest.id)}`);
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        setLatestReport({
          id: latest.id,
          name: latest.name,
          url: response.ok && typeof payload?.url === "string" ? payload.url : null,
        });
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    };

    void loadLatestReportUrl();

    return () => {
      cancelled = true;
    };
  }, [activeFolderIsReports, files]);

  const handleGenerateLink = async () => {
    if (!activeFolderId) return;
    setIsGeneratingLink(true);
    setGeneratedLink(null);
    setCopied(false);
    try {
      const res = await fetch("/api/slatedrop/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, folderId: activeFolderId }),
      });
      const data = await res.json();
      if (data.url) {
        const fullUrl = `${window.location.origin}${data.url}`;
        setGeneratedLink(fullUrl);
      }
    } catch (err) {
      console.error("Failed to generate link", err);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyReportLink = () => {
    if (!latestReport?.url) return;
    navigator.clipboard.writeText(latestReport.url);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 1800);
  };

  const handleExportCloseout = async () => {
    setIsExportingCloseout(true);
    try {
      const response = await fetch("/api/slatedrop/project-audit-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `project-closeout-${projectId}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingCloseout(false);
    }
  };

  return (
    <div className="grid min-h-[65vh] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-gray-900">Project Folders</h2>
        <p className="mt-1 text-xs text-gray-500">Scoped to this project only</p>

        <div className="mt-4 space-y-2">
          {foldersLoading ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500">
              <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading folders…
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500">
              No project folders found.
            </div>
          ) : (
            folders.map((folder) => {
              const active = folder.id === activeFolderId;
              return (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-[#FF4D00]/40 bg-[#FF4D00]/10 text-[#FF4D00]"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Folder size={14} />
                  <span className="truncate">{folder.name}</span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-gray-900">{activeFolder?.name ?? "Files"}</h2>
            <p className="mt-1 text-xs text-gray-500">{activeFolder?.path ?? "Select a folder to view files"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCloseout}
              disabled={isExportingCloseout}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {isExportingCloseout ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Export Closeout
            </button>

            {activeFolderId && (
              <button
                onClick={handleGenerateLink}
                disabled={isGeneratingLink}
                className="flex items-center gap-2 rounded-lg bg-[#FF4D00] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#E64500] disabled:opacity-50"
              >
                {isGeneratingLink ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                Request Link
              </button>
            )}
          </div>
        </div>

        {generatedLink && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-green-800">Public Upload Link Generated</p>
              <p className="truncate text-xs text-green-600">{generatedLink}</p>
            </div>
            <button
              onClick={handleCopy}
              className="ml-3 flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-green-700 shadow-sm ring-1 ring-inset ring-green-200 hover:bg-green-50"
            >
              {copied ? <Check size={12} /> : <LinkIcon size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {activeFolderIsReports && latestReport && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="text-xs font-semibold text-emerald-800">Latest Photo Report</p>
            <p className="mt-1 truncate text-xs text-emerald-700">{latestReport.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={latestReport.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
              >
                <ArrowUpRight size={12} /> View
              </a>
              <a
                href={latestReport.url ?? "#"}
                download={latestReport.name}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
              >
                <Download size={12} /> Download
              </a>
              <button
                onClick={handleCopyReportLink}
                disabled={!latestReport.url}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 disabled:opacity-60"
              >
                {reportCopied ? <Check size={12} /> : <LinkIcon size={12} />}
                {reportCopied ? "Copied" : "Copy Link"}
              </button>
            </div>
            {reportLoading && (
              <p className="mt-2 text-[11px] text-emerald-700">
                <Loader2 size={12} className="mr-1 inline animate-spin" /> Loading signed URL…
              </p>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {filesLoading ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500">
              <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading files…
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-3 py-8 text-center text-sm text-gray-500">
              No files in this folder yet.
            </div>
          ) : (
            files.map((file) => (
              <article key={file.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">{file.type || "file"}</p>
                </div>
                <FileText size={14} className="shrink-0 text-gray-400" />
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
