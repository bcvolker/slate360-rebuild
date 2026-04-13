"use client";

import { useEffect, useMemo, useState } from "react";

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

export type { FolderRow, FileRow, LatestReport };

export function useProjectFileExplorer(projectId: string, rootFolderId: string) {
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

  return {
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
  };
}
