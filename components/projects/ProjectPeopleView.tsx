"use client";

import { useState } from "react";
import { CollaboratorInviteModal } from "@/components/projects/CollaboratorInviteModal";
import { PeopleSection } from "@/components/projects/PeopleSection";
import type {
  LeadershipViewerRow,
  PendingInviteRow,
  ProjectMemberRow,
} from "@/lib/server/collaborator-data";

type Props = {
  projectId: string;
  projectName: string;
  members: ProjectMemberRow[];
  pendingInvites: PendingInviteRow[];
  leadershipViewers: LeadershipViewerRow[];
  seatUsage: { used: number; limit: number | null };
  canManage: boolean;
};

export function ProjectPeopleView({
  projectId,
  projectName,
  members,
  pendingInvites,
  leadershipViewers,
  seatUsage,
  canManage,
}: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const teammates = members.filter((m) => m.role !== "collaborator" && m.role !== "viewer");
  const collaborators = members.filter((m) => m.role === "collaborator");

  const limitLabel = seatUsage.limit === null ? "∞" : String(seatUsage.limit);
  const atLimit = seatUsage.limit !== null && seatUsage.used >= seatUsage.limit;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="flex items-end justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">People on {projectName}</h1>
          <p className="text-sm text-muted-foreground">
            Manage your project team, outside collaborators, and read-only leadership viewers.
          </p>
        </div>
        {canManage ? (
          <CollaboratorInviteModal
            projectId={projectId}
            disabled={atLimit}
            onInvited={refresh}
            triggerLabel={atLimit ? "Collaborator limit reached" : "+ Invite collaborator"}
          />
        ) : null}
      </header>

      <PeopleSection
        title="Project members"
        subtitle="Your subscribing teammates."
        rows={teammates.map((m) => ({
          key: m.user_id,
          primary: m.full_name ?? m.email ?? m.user_id,
          secondary: m.email ?? "",
          badge: m.role,
        }))}
        emptyLabel="No teammates assigned yet."
      />

      <PeopleSection
        title="Outside collaborators"
        subtitle={`${seatUsage.used} / ${limitLabel} seats used across all your projects.`}
        rows={[
          ...collaborators.map((m) => ({
            key: `member:${m.user_id}`,
            primary: m.full_name ?? m.email ?? m.user_id,
            secondary: m.email ?? "",
            badge: "collaborator",
          })),
          ...pendingInvites.map((inv) => ({
            key: `invite:${inv.id}`,
            primary: inv.email ?? inv.phone ?? "Pending invite",
            secondary: `via ${inv.channel} · sent ${new Date(inv.created_at).toLocaleDateString()}`,
            badge: "pending",
            actions: canManage ? (
              <PendingInviteActions
                projectId={projectId}
                inviteId={inv.id}
                onChange={refresh}
              />
            ) : null,
          })),
        ]}
        emptyLabel="No outside collaborators yet."
        refreshKey={refreshKey}
      />

      <PeopleSection
        title="Shared with leadership"
        subtitle="Auto-included org viewers (e.g. ASU directors). Managed in Workspace › Members."
        rows={leadershipViewers.map((v) => ({
          key: v.user_id,
          primary: v.full_name ?? v.email ?? v.user_id,
          secondary: v.email ?? "",
          badge: "viewer",
        }))}
        emptyLabel="No leadership viewers."
      />
    </div>
  );
}

function PendingInviteActions({
  projectId,
  inviteId,
  onChange,
}: {
  projectId: string;
  inviteId: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<"resend" | "revoke" | null>(null);

  const call = async (action: "resend" | "revoke") => {
    setBusy(action);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/collaborators/${inviteId}/${action}`,
        { method: "POST" },
      );
      if (res.ok) onChange();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex gap-2 text-xs">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => call("resend")}
        className="rounded border border-border px-2 py-1 text-foreground hover:bg-muted disabled:opacity-50"
      >
        {busy === "resend" ? "…" : "Resend"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => call("revoke")}
        className="rounded border border-border px-2 py-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {busy === "revoke" ? "…" : "Revoke"}
      </button>
    </div>
  );
}
