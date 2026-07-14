"use client";

import { useRouter } from "next/navigation";
import { CollaboratorInviteModal } from "@/components/projects/CollaboratorInviteModal";
import { SW360DeleteProjectButton } from "@/components/sw360/SW360DeleteProjectButton";
import type { ProjectTeamTabData } from "@/lib/projects/team-tab-data";

/**
 * SW360-styled Team tab. Reuses the production-grade collaborator-invite
 * backend (CollaboratorInviteModal -> /api/projects/[id]/collaborators/invite)
 * as-is rather than rebuilding the invite flow. Danger-zone delete moved here
 * from the old flat project page (team/admin is where that action belongs).
 */
export function SW360TeamTabClient({
  data,
  canInvite,
  projectName,
}: {
  data: ProjectTeamTabData;
  canInvite: boolean;
  projectName: string;
}) {
  const router = useRouter();
  const atLimit = data.seatUsage.limit !== null && data.seatUsage.used >= data.seatUsage.limit;
  const total = data.members.length + data.pendingInvites.length;

  return (
    <div className="flex flex-col gap-4">
      {canInvite ? (
        <CollaboratorInviteModal
          projectId={data.projectId}
          disabled={atLimit}
          onInvited={() => router.refresh()}
          triggerLabel={atLimit ? "Collaborator limit reached" : "+ Invite to this project"}
        />
      ) : null}

      {total === 0 ? (
        <p className="text-sm text-[var(--sw360-charcoal)]/60">No one on this project yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">
                  {m.full_name || m.email}
                </p>
                {m.full_name ? (
                  <p className="truncate text-xs text-[var(--sw360-charcoal)]/50">{m.email}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                {m.role}
              </span>
            </div>
          ))}
          {data.pendingInvites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-4 py-3"
            >
              <p className="truncate text-sm text-[var(--sw360-charcoal)]/70">{inv.email ?? inv.phone ?? "Invited"}</p>
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/40">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 border-t border-[var(--border)] pt-4">
        <SW360DeleteProjectButton projectId={data.projectId} projectName={projectName} />
      </div>
    </div>
  );
}
