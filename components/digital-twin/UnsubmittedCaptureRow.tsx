"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Image as ImageIcon, Scan, Loader2 } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import type { UnsubmittedTwinCapture } from "@/lib/digital-twin/load-unsubmitted-captures";

type Workspace = { id: string; title: string };

export function UnsubmittedCaptureRow({
  capture,
  workspaces,
}: {
  capture: UnsubmittedTwinCapture;
  workspaces: Workspace[];
}) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);

  const resumeHref = `/digital-twin/upload?capture=${capture.id}${
    capture.projectId ? `&projectId=${capture.projectId}&mode=project` : ""
  }`;

  // Other workspaces this capture could move to (re-point only).
  const moveTargets = workspaces.filter((w) => w.id !== capture.spaceId);

  async function move(spaceId: string) {
    if (!spaceId) return;
    setMoving(true);
    try {
      const res = await fetch(`/api/digital-twin/captures/${capture.id}/relink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className={cn(mobileTokens.mobileGlassCardSurface, "px-4 py-3")}>
      <div className="flex items-center justify-between gap-3">
        <Link href={resumeHref} className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-100">{capture.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
            {capture.counts.video > 0 ? (
              <span className="inline-flex items-center gap-1"><Film className="h-3 w-3" aria-hidden /> {capture.counts.video} video</span>
            ) : null}
            {capture.counts.photo > 0 ? (
              <span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" aria-hidden /> {capture.counts.photo} photo</span>
            ) : null}
            {capture.counts.lidar > 0 ? (
              <span className="inline-flex items-center gap-1"><Scan className="h-3 w-3" aria-hidden /> {capture.counts.lidar} LiDAR</span>
            ) : null}
            {capture.counts.other > 0 ? <span>{capture.counts.other} other</span> : null}
          </span>
        </Link>
        <Link href={resumeHref} className={cn("shrink-0 text-[12px] font-semibold", twinAccent.link)}>
          Resume →
        </Link>
      </div>

      {moveTargets.length > 0 ? (
        <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-2">
          {moving ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Moving…
            </span>
          ) : (
            <>
              <span className="text-[11px] text-zinc-500">Move to workspace</span>
              <select
                defaultValue=""
                onChange={(e) => void move(e.target.value)}
                className="min-h-7 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] text-zinc-200 outline-none"
                aria-label="Move capture to a different twin workspace"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {moveTargets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
