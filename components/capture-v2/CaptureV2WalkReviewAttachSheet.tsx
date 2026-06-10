"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileHomeListRow, mobileTokens } from "@/components/mobile-system";
import type { HubProject } from "@/lib/types/site-walk";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  projects: HubProject[];
};

export function CaptureV2WalkReviewAttachSheet({
  open,
  onOpenChange,
  sessionId,
  projects,
}: Props) {
  const router = useRouter();
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function attachToProject(project: HubProject) {
    setAttachingId(project.id);
    setError(null);
    try {
      const response = await fetch("/api/site-walk/session/attach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          project_id: project.id,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not attach walk to project");
      onOpenChange(false);
      router.refresh();
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : "Could not attach walk");
    } finally {
      setAttachingId(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(72dvh,520px)] rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
      >
        <SheetHeader className="text-left">
          <span className={mobileTokens.siteWalkHomeSectionLabelAccent} aria-hidden />
          <SheetTitle className={mobileTokens.appHomeSectionLabel}>Attach to project</SheetTitle>
        </SheetHeader>
        <div className="mt-4 max-h-[min(52dvh,400px)] space-y-2 overflow-y-auto overscroll-contain">
          {projects.length === 0 ? (
            <p className={mobileTokens.mobileHomeHeroSubtext}>
              No projects yet. Create a project, then attach this walk.
            </p>
          ) : (
            projects.map((project) => (
              <MobileHomeListRow
                key={project.id}
                title={project.name}
                meta={project.status}
                metaTone="primary"
                onClick={() => {
                  if (attachingId) return;
                  void attachToProject(project);
                }}
              />
            ))
          )}
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
              {error}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
