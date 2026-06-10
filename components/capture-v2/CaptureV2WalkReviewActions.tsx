"use client";

import Link from "next/link";
import { useState } from "react";
import type { HubProject } from "@/lib/types/site-walk";
import { CaptureV2WalkReviewAttachSheet } from "./CaptureV2WalkReviewAttachSheet";
import { walkReviewTokens } from "./capture-v2-walk-review-tokens";

type Props = {
  sessionId: string;
  showAttachToProject: boolean;
  projects: HubProject[];
  deliverableHref: string;
};

export function CaptureV2WalkReviewActions({
  sessionId,
  showAttachToProject,
  projects,
  deliverableHref,
}: Props) {
  const [attachOpen, setAttachOpen] = useState(false);

  return (
    <>
      <footer
        className={`${walkReviewTokens.pinnedActions} ${walkReviewTokens.margin} space-y-2 py-3 pb-[max(env(safe-area-inset-bottom),12px)]`}
        data-walk-review="actions"
      >
        {showAttachToProject ? (
          <button
            type="button"
            onClick={() => setAttachOpen(true)}
            className={`${walkReviewTokens.ghostButton} w-full`}
          >
            Attach to project
          </button>
        ) : null}
        <Link href={deliverableHref} className={`${walkReviewTokens.primaryButton} w-full`}>
          Create deliverable
        </Link>
      </footer>

      <CaptureV2WalkReviewAttachSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        sessionId={sessionId}
        projects={projects}
      />
    </>
  );
}
