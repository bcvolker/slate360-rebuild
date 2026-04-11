"use client";

import { useCommandCenterData } from "@/lib/hooks/useCommandCenterData";
import { ProjectOverviewCard } from "./ProjectOverviewCard";
import { PendingItemsCard } from "./PendingItemsCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { RecentFilesCard } from "./RecentFilesCard";
import { StorageCreditsCard } from "./StorageCreditsCard";

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
}

export function CommandCenterContent({ userName, orgName, storageLimitGb }: CommandCenterContentProps) {
  const { projects, recentFiles, storageUsedBytes, isLoading, error } = useCommandCenterData();

  const firstName = userName.split(" ")[0] || orgName || "there";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="space-y-1">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
          Welcome back,{" "}
          <span className="text-primary">{firstName}</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Here&apos;s what&apos;s happening across your projects.
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error} — showing cached data where available.
        </div>
      )}

      {/* Row 1: Projects + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjectOverviewCard data={projects} isLoading={isLoading} />
        </div>
        <QuickActionsCard />
      </div>

      {/* Row 2: Pending Items + Recent Files */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PendingItemsCard data={projects} isLoading={isLoading} />
        <RecentFilesCard files={recentFiles} isLoading={isLoading} />
      </div>

      {/* Row 3: Storage */}
      <StorageCreditsCard
        storageUsedBytes={storageUsedBytes}
        storageLimitGb={storageLimitGb}
        isLoading={isLoading}
      />
    </div>
  );
}
