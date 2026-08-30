"use client";

import { useEffect, useState } from "react";
import { ShareRoleMatrix } from "@/components/spatial-walkthrough/portal/ShareRoleMatrix";
import { channelLabel } from "@/lib/spatial-walkthrough/share-roles";

type ShareRow = {
  id: string;
  walkthroughTitle: string;
  policy: "client" | "public";
  token: string;
  is_revoked: boolean;
  allow_download: boolean;
  expires_at: string | null;
};

export function ProjectSharingBoard({ projectId }: { projectId: string }) {
  const [shares, setShares] = useState<ShareRow[]>([]);

  useEffect(() => {
    void fetch(`/api/spatial-walkthrough/shares?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setShares(j.shares ?? []));
  }, [projectId]);

  const guest = shares.filter((s) => s.policy === "client" && !s.is_revoked);
  const pub = shares.filter((s) => s.policy === "public" && !s.is_revoked);

  return (
    <div className="space-y-5">
      <ShareRoleMatrix />
      <ShareList
        title={channelLabel("guest")}
        empty="No guest links yet. Create one from a walkthrough when it is ready."
        rows={guest}
      />
      <ShareList
        title={channelLabel("public")}
        empty="No public links yet."
        rows={pub}
      />
    </div>
  );
}

function ShareList({ title, empty, rows }: { title: string; empty: string; rows: ShareRow[] }) {
  return (
    <section className="border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--graphite-muted)]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-[var(--graphite-text-header)]">{row.walkthroughTitle}</span>
              <span className="text-[var(--graphite-muted)]">
                {row.allow_download ? "View + download" : "View only"}
                {row.expires_at ? ` · expires ${new Date(row.expires_at).toLocaleDateString()}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
