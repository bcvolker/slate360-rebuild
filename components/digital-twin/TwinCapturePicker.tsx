"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { IconChevronRight, IconScan } from "@tabler/icons-react";
import { mobileTokens } from "@/components/mobile-system";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  spaces: HubTwin[];
  projects: HubTwinProject[];
  onStart: (selection: { spaceId: string; projectId: string; spaceTitle: string }) => void;
};

export function TwinCapturePicker({ spaces, projects, onStart }: Props) {
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "");
  const [projectId, setProjectId] = useState(
    spaces[0]?.projectId ?? projects[0]?.id ?? "",
  );

  const selectedSpace = spaces.find((row) => row.id === spaceId) ?? null;

  const onSpaceChange = useCallback(
    (nextSpaceId: string) => {
      setSpaceId(nextSpaceId);
      const space = spaces.find((row) => row.id === nextSpaceId);
      if (space?.projectId) setProjectId(space.projectId);
    },
    [spaces],
  );

  const canStart = Boolean(spaceId && projectId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
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
            <h2 className="text-sm font-semibold text-zinc-100">Quick Capture</h2>
            <p className="text-xs text-zinc-400">Walk the space and capture photos or video</p>
          </div>
        </div>

        {spaces.length === 0 ? (
          <p className="text-[13px] text-zinc-400">
            Create a twin workspace from{" "}
            <Link href="/projects" className={twinAccent.link}>
              a project
            </Link>{" "}
            first, then return here to capture.
          </p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Twin workspace
              <select
                value={spaceId}
                onChange={(e) => onSpaceChange(e.target.value)}
                className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100"
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.title}
                    {space.projectName ? ` · ${space.projectName}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {projects.length > 1 && !selectedSpace?.projectId ? (
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Project
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
