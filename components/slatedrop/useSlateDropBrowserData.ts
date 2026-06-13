"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/lib/slatedrop/helpers";
import type { SlateDropBrowseFolder, SlateDropBrowserFile } from "./slatedrop-browser-types";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DashboardSummaryPayload = {
  recentFiles?: Array<{
    id: string;
    file_name: string;
    file_size: number;
    file_type: string | null;
    created_at: string;
  }>;
  storageUsedGb?: number;
};

type UseSlateDropBrowserDataArgs = {
  folders: SlateDropBrowseFolder[];
  maxStorageGB: number;
};

export function useSlateDropBrowserData({ folders, maxStorageGB }: UseSlateDropBrowserDataArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [storageUsedGb, setStorageUsedGb] = useState(0);
  const [recentFiles, setRecentFiles] = useState<SlateDropBrowserFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      try {
        const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as DashboardSummaryPayload;
        if (cancelled || !response.ok) return;

        setStorageUsedGb(Number(payload.storageUsedGb ?? 0));
        const rows = Array.isArray(payload.recentFiles) ? payload.recentFiles : [];
        setRecentFiles(
          rows.map((row) => ({
            id: row.id,
            name: row.file_name,
            type: row.file_type || "file",
            date: formatShortDate(row.created_at),
            size: formatBytes(Number(row.file_size ?? 0)),
            sizeBytes: Number(row.file_size ?? 0),
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const files = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentFiles;
    return recentFiles.filter((file) => file.name.toLowerCase().includes(q));
  }, [recentFiles, searchQuery]);

  return {
    folders,
    files,
    storageUsedGb,
    storageLimitGb: maxStorageGB,
    searchQuery,
    setSearchQuery,
    loading,
  };
}

export type ReturnTypeUseSlateDropBrowserData = ReturnType<typeof useSlateDropBrowserData>;
