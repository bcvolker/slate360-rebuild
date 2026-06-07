"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileHomeListRow, mobileTokens } from "@/components/mobile-system";
import type { HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: HubTwinProject[];
  onSelect: (project: HubTwinProject) => void;
};

export function DigitalTwinProjectTargetSheet({
  open,
  onOpenChange,
  projects,
  onSelect,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(72dvh,520px)] rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
      >
        <SheetHeader className="text-left">
          <span className={mobileTokens.twin360HomeSectionLabelAccent} aria-hidden />
          <SheetTitle className={mobileTokens.appHomeSectionLabel}>Choose a project</SheetTitle>
        </SheetHeader>
        <div className="mt-4 max-h-[min(52dvh,400px)] space-y-2 overflow-y-auto overscroll-contain">
          {projects.length === 0 ? (
            <p className={mobileTokens.mobileHomeHeroSubtext}>
              No projects yet. Create a project, then scan with full project context and files.
            </p>
          ) : (
            projects.map((project) => (
              <MobileHomeListRow
                key={project.id}
                title={project.name}
                meta={project.status}
                metaTone="info"
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
