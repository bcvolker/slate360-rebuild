"use client";

import { FolderOpen, Upload, Share2, Link as LinkIcon } from "lucide-react";
import type { HubProject } from "@/lib/types/site-walk";
import { type RouterLike } from "./v1-view-utils";
import { MobileEmptyState, MobileComingSoonSheet } from "@/components/mobile-system";
import { useState } from "react";

type SlateDropViewProps = {
  projects: HubProject[];
  router: RouterLike;
};

const sections: { icon: typeof FolderOpen; label: string; href: string }[] = [
  { icon: FolderOpen, label: "All Files", href: "/slatedrop" },
  { icon: Upload, label: "Recent Uploads", href: "/slatedrop" },
  { icon: Share2, label: "Shared Drops", href: "/slatedrop" },
  { icon: LinkIcon, label: "File Requests", href: "/slatedrop" },
];

export function SlateDropView({ projects, router }: SlateDropViewProps) {
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-2">
        {sections.map(({ icon: Icon, label, href }) => (
          <button
            key={label}
            type="button"
            onClick={() => setComingSoonTitle(label)}
            className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            <Icon className="size-4 shrink-0 text-zinc-500" />
            {label}
          </button>
        ))}
      </div>

      {projects.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
            Worksite folders
          </p>
          <div className="flex flex-col gap-1.5">
            {projects.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setComingSoonTitle("Project Dashboard")}
                className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.06]"
              >
                <FolderOpen className="size-4 shrink-0 text-amber-500/60" />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <MobileEmptyState title="No SlateDrop folders yet." description="Create a Worksite to organize plans, photos, captures, deliverables, and shared files." />
      )}
      {comingSoonTitle && (
        <MobileComingSoonSheet
          open={!!comingSoonTitle}
          onOpenChange={(open) => !open && setComingSoonTitle(null)}
          title={`${comingSoonTitle} on Mobile`}
        />
      )}
    </div>
  );
}
