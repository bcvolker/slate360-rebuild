"use client";

import GlassCard from "@/components/shared/GlassCard";
import { Loader2, Folder, FileText, Link as LinkIcon, Check, ArrowUpRight, Download } from "lucide-react";
import { useProjectFileExplorer } from "./useProjectFileExplorer";

export default function ProjectFileExplorer({
  projectId,
  rootFolderId,
}: {
  projectId: string;
  rootFolderId: string;
}) {
  const {
    foldersLoading,
    folders,
    activeFolderId,
    setActiveFolderId,
    filesLoading,
    files,
    activeFolder,
    activeFolderIsReports,
    isGeneratingLink,
    isExportingCloseout,
    generatedLink,
    copied,
    latestReport,
    reportLoading,
    reportCopied,
    handleGenerateLink,
    handleCopy,
    handleCopyReportLink,
    handleExportCloseout,
  } = useProjectFileExplorer(projectId, rootFolderId);

  // Deliverable LINK rows open their in-app viewer; real files resolve a signed
  // download URL (the download route returns { openHref } for any sentinel too).
  const handleOpenFile = async (file: { id: string; openHref?: string }) => {
    if (file.openHref) {
      window.location.assign(file.openHref);
      return;
    }
    try {
      const res = await fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(file.id)}`);
      const data = await res.json().catch(() => ({}));
      if (data.openHref) {
        window.location.assign(data.openHref);
        return;
      }
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="grid min-h-[65vh] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] p-4 shadow-sm">
        <h2 className="text-sm font-black text-[var(--graphite-text-body)]">Project Folders</h2>
        <p className="mt-1 text-xs text-[var(--graphite-muted)]">Scoped to this project only</p>

        <div className="mt-4 space-y-2">
          {foldersLoading ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-[var(--graphite-muted)]">
              <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading folders…
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-sm text-[var(--graphite-muted)]">
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
                      ? "border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]"
                      : "border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] text-[var(--graphite-text-body)] hover:bg-white/[0.03]"
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

      <section className="rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[var(--graphite-text-body)]">{activeFolder?.name ?? "Files"}</h2>
            <p className="mt-1 text-xs text-[var(--graphite-muted)]">{activeFolder?.path ?? "Select a folder to view files"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCloseout}
              disabled={isExportingCloseout}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--graphite-text-body)] transition hover:bg-white/[0.03] disabled:opacity-50"
            >
              {isExportingCloseout ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Export Closeout
            </button>

            {activeFolderId && (
              <button
                onClick={handleGenerateLink}
                disabled={isGeneratingLink}
                className="flex items-center gap-2 rounded-lg bg-[var(--graphite-primary)] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:opacity-90 disabled:opacity-50"
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
              <p className="truncate text-xs text-emerald-400">{generatedLink}</p>
            </div>
            <button
              onClick={handleCopy}
              className="ml-3 flex shrink-0 items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-2 py-1 text-xs font-medium text-emerald-300 shadow-sm ring-1 ring-inset ring-green-200 hover:bg-emerald-500/10"
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
                className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
              >
                <ArrowUpRight size={12} /> View
              </a>
              <a
                href={latestReport.url ?? "#"}
                download={latestReport.name}
                className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
              >
                <Download size={12} /> Download
              </a>
              <button
                onClick={handleCopyReportLink}
                disabled={!latestReport.url}
                className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 disabled:opacity-60"
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
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-[var(--graphite-muted)]">
              <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading files…
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-[var(--graphite-muted)]">
              No files in this folder yet.
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => handleOpenFile(file)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--graphite-text-body)]">{file.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--graphite-muted)]">{file.type || "file"}</p>
                </div>
                {file.openHref ? (
                  <ArrowUpRight size={14} className="shrink-0 text-[var(--graphite-primary)]" />
                ) : (
                  <Download size={14} className="shrink-0 text-[var(--graphite-muted)]" />
                )}
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
