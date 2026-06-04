"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileHomeListRow, mobileTokens } from "@/components/mobile-system";
import type { HubProject } from "@/lib/types/site-walk";
import type { SiteWalkWalkStartTier } from "@/lib/site-walk/resolve-walk-start-tier";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: SiteWalkWalkStartTier;
  targets: HubProject[];
  onSelect: (project: HubProject) => void;
};

const COPY: Record<
  SiteWalkWalkStartTier,
  { title: string; empty: string }
> = {
  workspace: {
    title: "Choose a workspace",
    empty: "No workspaces yet. Create one in setup, then start your walk.",
  },
  project: {
    title: "Choose a project",
    empty: "No projects yet. Create a project, then start your walk.",
  },
};

export function SiteWalkWalkTargetSheet({
  open,
  onOpenChange,
  tier,
  targets,
  onSelect,
}: Props) {
  const copy = COPY[tier];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(72dvh,520px)] rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
      >
        <SheetHeader className="text-left">
          <span className={mobileTokens.siteWalkHomeSectionLabelAccent} aria-hidden />
          <SheetTitle className={mobileTokens.appHomeSectionLabel}>{copy.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 max-h-[min(52dvh,400px)] space-y-2 overflow-y-auto overscroll-contain">
          {targets.length === 0 ? (
            <p className={mobileTokens.mobileHomeHeroSubtext}>{copy.empty}</p>
          ) : (
            targets.map((project) => (
              <MobileHomeListRow
                key={project.id}
                title={project.name}
                meta={project.status}
                metaTone="primary"
                onClick={() => {
                  onSelect(project);
                  onOpenChange(false);
                }}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
