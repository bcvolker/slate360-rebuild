"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { projectWalkthroughFilterHref } from "@/lib/product-shell/library-kinds";

type Counts = { walkthroughs: number; twins: number; siteWalks: number };

export function ProjectCardDeliverables({ projectId }: { projectId: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let live = true;
    void fetch(`/api/spatial-walkthrough?projectId=${projectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!live) return;
        const n = Array.isArray(json.walkthroughs) ? json.walkthroughs.length : 0;
        setCounts({ walkthroughs: n, twins: 0, siteWalks: 0 });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [projectId]);

  if (!counts || counts.walkthroughs < 1) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Link
        href={projectWalkthroughFilterHref(projectId)}
        className="inline-flex h-8 items-center border border-white/15 px-2 text-[11px] uppercase tracking-wide text-white"
        onClick={(e) => e.stopPropagation()}
      >
        Walkthrough {counts.walkthroughs}
      </Link>
    </div>
  );
}
