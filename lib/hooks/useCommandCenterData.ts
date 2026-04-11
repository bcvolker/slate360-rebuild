"use client";

import { useEffect, useState } from "react";
import type { CommandCenterData, ProjectSummary, RecentFile } from "@/lib/types/command-center";

const EMPTY_SUMMARY: ProjectSummary = {
  totals: { projects: 0, activeProjects: 0, completedProjects: 0, onHoldProjects: 0 },
  budget: { totalBudget: 0, totalSpent: 0, totalChangeOrders: 0 },
  work: { openRfis: 0, pendingSubmittals: 0 },
  recentProjects: [],
};

export function useCommandCenterData(): CommandCenterData {
  const [projects, setProjects] = useState<ProjectSummary>(EMPTY_SUMMARY);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, projectsRes] = await Promise.all([
          fetch("/api/dashboard/summary"),
          fetch("/api/projects/summary"),
        ]);

        if (cancelled) return;

        if (!summaryRes.ok || !projectsRes.ok) {
          setError("Failed to load dashboard data");
          return;
        }

        const summaryData = await summaryRes.json();
        const projectsData = await projectsRes.json();

        if (cancelled) return;

        setRecentFiles(summaryData.recentFiles ?? []);
        setStorageUsedBytes(summaryData.storageUsed ?? 0);
        setProjects(projectsData ?? EMPTY_SUMMARY);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { projects, recentFiles, storageUsedBytes, isLoading, error };
}
