"use client";

import { useEffect, useState } from "react";
import { WalkthroughLibrary, type WalkthroughCard } from "@/components/spatial-walkthrough/WalkthroughLibrary";
import { WalkthroughSpaceList } from "@/components/spatial-walkthrough/WalkthroughSpaceList";
import type { SpaceCard } from "@/lib/spatial-walkthrough/space-cards";
import { spaceHref } from "@/lib/spatial-walkthrough/space-cards";

export function ProjectWalkthroughLibrary({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<WalkthroughCard[]>([]);
  const [spaces, setSpaces] = useState<SpaceCard[]>([]);

  useEffect(() => {
    void fetch(`/api/spatial-walkthrough?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setItems(j.walkthroughs ?? []);
        setSpaces(j.spaces ?? []);
      });
  }, [projectId]);

  const href = (id: string) => `/spatial-walkthrough/${id}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Project</p>
        <h2 className="text-xl font-semibold text-[var(--graphite-text-header)]">Spatial Walkthroughs</h2>
      </div>
      <WalkthroughLibrary items={items} hrefFor={href} />
      <WalkthroughSpaceList items={spaces} hrefFor={(item) => spaceHref(item, href)} />
    </div>
  );
}
