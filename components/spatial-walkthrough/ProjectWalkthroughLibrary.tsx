"use client";

import { useEffect, useState } from "react";
import { WalkthroughLibrary, type WalkthroughCard } from "@/components/spatial-walkthrough/WalkthroughLibrary";

export function ProjectWalkthroughLibrary({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<WalkthroughCard[]>([]);

  useEffect(() => {
    void fetch(`/api/spatial-walkthrough?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(j.walkthroughs ?? []));
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Project</p>
        <h2 className="text-xl font-semibold text-[var(--graphite-text-header)]">Spatial Walkthroughs</h2>
      </div>
      <WalkthroughLibrary
        items={items}
        hrefFor={(id) => `/projects/${projectId}/walkthroughs/${id}`}
      />
    </div>
  );
}
