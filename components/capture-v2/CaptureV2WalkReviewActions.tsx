"use client";

import Link from "next/link";
import { useState } from "react";
import type { HubProject } from "@/lib/types/site-walk";
import { CaptureV2WalkReviewAttachSheet } from "./CaptureV2WalkReviewAttachSheet";
import { CaptureV2GenerateDeliverableSheet } from "./CaptureV2GenerateDeliverableSheet";
import { walkReviewTokens } from "./capture-v2-walk-review-tokens";

type Props = {
  sessionId: string;
  projectId: string | null;
  showAttachToProject: boolean;
  projects: HubProject[];
};

export function CaptureV2WalkReviewActions({
  sessionId,
  projectId,
  showAttachToProject,
  projects,
}: Props) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const projectHref = projectId ? `/projects/${encodeURIComponent(projectId)}` : null;

  return (
    <>
      <footer
        className={`${walkReviewTokens.pinnedActions} ${walkReviewTokens.margin} space-y-2 py-3 pb-[max(env(safe-area-inset-bottom),12px)]`}
        data-walk-review="actions"
      >
        <button
          type="button"
          onClick={() => setGenerateOpen(true)}
          className={`${walkReviewTokens.primaryButton} w-full`}
        >
          Generate deliverable
        </button>

        {projectHref ? (
          <Link href={projectHref} className={`${walkReviewTokens.ghostButton} w-full`}>
            Open project
          </Link>
        ) : showAttachToProject ? (
          <button
            type="button"
            onClick={() => setAttachOpen(true)}
            className={`${walkReviewTokens.ghostButton} w-full`}
          >
            Open project
          </button>
        ) : null}

        <Link href="/site-walk" className={`${walkReviewTokens.ghostButton} w-full`}>
          Back to Site Walk
        </Link>
      </footer>

      <CaptureV2WalkReviewAttachSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        sessionId={sessionId}
        projects={projects}
      />

      <CaptureV2GenerateDeliverableSheet
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        sessionId={sessionId}
        projectId={projectId}
      />
    </>
  );
}
