"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { IconChevronRight, IconScan } from "@tabler/icons-react";
import { mobileTokens } from "@/components/mobile-system";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";
import { CreateTwinSpaceForm } from "./CreateTwinSpaceForm";

type Props = {
  spaces: HubTwin[];
  projects: HubTwinProject[];
  initialProjectId?: string | null;
  lockProject?: boolean;
  onStart: (selection: { spaceId: string; projectId: string; spaceTitle: string }) => void;
  onSpaceCreated?: (space: HubTwin) => void;
};

const fieldLabelClass =
  "text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400";
const fieldControlClass =
  "min-h-[44px] rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-zinc-100 backdrop-blur-sm";

export function TwinCapturePicker({
  spaces,
  projects,
  initialProjectId,
  lockProject = false,
  onStart,
  onSpaceCreated,
}: Props) {
  const scopedSpaces = useMemo(() => {
    if (!lockProject || !initialProjectId) return spaces;
    return spaces.filter((space) => space.projectId === initialProjectId);
  }, [initialProjectId, lockProject, spaces]);

  const scopedProjects = useMemo(() => {
    if (!lockProject || !initialProjectId) return projects;
    return projects.filter((project) => project.id === initialProjectId);
  }, [initialProjectId, lockProject, projects]);

  const [spaceId, setSpaceId] = useState(scopedSpaces[0]?.id ?? "");
  const [projectId, setProjectId] = useState(
    initialProjectId ?? scopedSpaces[0]?.projectId ?? scopedProjects[0]?.id ?? "",
  );

  const selectedSpace = scopedSpaces.find((row) => row.id === spaceId) ?? null;

  const onSpaceChange = useCallback(
    (nextSpaceId: string) => {
      setSpaceId(nextSpaceId);
      const space = scopedSpaces.find((row) => row.id === nextSpaceId);
      if (space?.projectId) setProjectId(space.projectId);
    },
    [scopedSpaces],
  );

  const canStart = Boolean(spaceId && projectId);
  const heading = lockProject ? "Scan from Project" : "Quick Scan";
  const subheading = lockProject
    ? "Capture with project files and workspace context"
    : "Walk the space and capture photos or video";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4"
      data-twin-capture-picker
    >
      <div className={mobileTokens.mobileHomeSectionHeader}>
        <span className={mobileTokens.twin360HomeSectionLabelAccent} aria-hidden />
        <p className={mobileTokens.appHomeSectionLabel}>Start Scan</p>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 p-4",
          mobileTokens.twin360StartScanCard,
          "min-h-0 shadow-none active:scale-100 active:ring-0",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              twinAccent.iconChip,
            )}
          >
            <IconScan className="h-5 w-5" stroke={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight text-[var(--mobile-app-card-title-fg-info)]">
              {heading}
            </h2>
            <p className="mt-0.5 text-sm font-medium leading-snug text-[var(--mobile-app-card-subtitle-fg-info)]">
              {subheading}
            </p>
          </div>
        </div>

        {scopedSpaces.length === 0 ? (
          <CreateTwinSpaceForm
            projects={scopedProjects}
            lockedProjectId={lockProject ? initialProjectId ?? undefined : undefined}
            onCreated={(space) => {
              onSpaceCreated?.(space);
              setSpaceId(space.id);
              if (space.projectId) setProjectId(space.projectId);
            }}
          />
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelClass}>Twin workspace</span>
              <select
                value={spaceId}
                onChange={(e) => onSpaceChange(e.target.value)}
                className={fieldControlClass}
              >
                {scopedSpaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.title}
                    {space.projectName ? ` · ${space.projectName}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {scopedProjects.length > 1 && !selectedSpace?.projectId && !lockProject ? (
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabelClass}>Project</span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={fieldControlClass}
                >
                  {scopedProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <CreateTwinSpaceForm
              projects={scopedProjects}
              lockedProjectId={lockProject ? initialProjectId ?? undefined : undefined}
              onCreated={(space) => {
                onSpaceCreated?.(space);
                setSpaceId(space.id);
                if (space.projectId) setProjectId(space.projectId);
              }}
            />
          </>
        )}

        <button
          type="button"
          disabled={!canStart}
          onClick={() =>
            onStart({
              spaceId,
              projectId,
              spaceTitle: selectedSpace?.title ?? "Capture",
            })
          }
          className={cn(
            "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold",
            mobileTokens.mobilePrimaryButton,
            mobileTokens.focusRing,
            !canStart && "pointer-events-none opacity-50",
          )}
        >
          Start capture
          <IconChevronRight className="h-4 w-4" stroke={1.75} />
        </button>

        <Link href="/digital-twin/twins" className={cn("text-center text-xs", twinAccent.link)}>
          View captured twins
        </Link>
      </div>
    </div>
  );
}
