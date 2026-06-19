"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { CollaboratorInviteModal } from "@/components/projects/CollaboratorInviteModal";
import { PeopleSection } from "@/components/projects/PeopleSection";
import { ProjectDetailEmptyState } from "@/components/projects/ProjectDetailEmptyState";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { COLLABORATOR_UPGRADE_TOOLTIP } from "@/lib/projects/project-collaborator-entitlement";
import type { ProjectTeamTabData } from "@/lib/projects/team-tab-data";

type ProjectTeamTabProps = {
  data: ProjectTeamTabData;
  canManage: boolean;
  canInviteCollaborators: boolean;
  basePath?: "/projects";
};

export function ProjectTeamTab({
  data,
  canManage,
  canInviteCollaborators,
  basePath = "/projects",
}: ProjectTeamTabProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((key) => key + 1);

  const teammates = data.members.filter(
    (member) => member.role !== "collaborator" && member.role !== "viewer",
  );
  const collaborators = data.members.filter((member) => member.role === "collaborator");
  const limitLabel = data.seatUsage.limit === null ? "∞" : String(data.seatUsage.limit);
  const atLimit =
    data.seatUsage.limit !== null && data.seatUsage.used >= data.seatUsage.limit;
  const totalPeople =
    teammates.length + collaborators.length + data.pendingInvites.length;

  return (
    <div className="space-y-6">
      <section className={t.sectionCard}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={t.eyebrow}>Team</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--graphite-text-header)]">
              People on this project
            </h2>
            <p className="mt-1 text-sm text-[var(--graphite-muted)]">
              {totalPeople > 0
                ? `${totalPeople} member${totalPeople === 1 ? "" : "s"} and invite${data.pendingInvites.length === 1 ? "" : "s"}.`
                : canInviteCollaborators
                  ? "Invite teammates and collaborators to work on this project."
                  : "Collaborators are not available on your current plan."}
            </p>
          </div>
          {canManage && canInviteCollaborators ? (
            <CollaboratorInviteModal
              projectId={data.projectId}
              disabled={atLimit}
              onInvited={refresh}
              triggerLabel={atLimit ? "Collaborator limit reached" : "Invite collaborator"}
            />
          ) : canManage ? (
            <button
              type="button"
              disabled
              title={COLLABORATOR_UPGRADE_TOOLTIP}
              className={t.disabledButton}
            >
              Invite collaborator
            </button>
          ) : null}
        </div>
      </section>

      {totalPeople === 0 ? (
        <ProjectDetailEmptyState
          title={canInviteCollaborators ? "No collaborators yet" : "Collaborators not available on your plan"}
          description={
            canInviteCollaborators
              ? "Invite collaborators or assign teammates to start working on this project."
              : COLLABORATOR_UPGRADE_TOOLTIP
          }
          actionLabel={canInviteCollaborators ? "Manage team" : "View billing"}
          actionHref={canInviteCollaborators ? `${basePath}/${data.projectId}/people` : "/more/billing"}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PeopleSection
            title="Project members"
            subtitle="Your subscribing teammates."
            rows={teammates.map((member) => ({
              key: member.user_id,
              primary: member.full_name ?? member.email ?? member.user_id,
              secondary: member.email ?? "",
              badge: member.role,
            }))}
            emptyLabel="No teammates assigned yet."
            refreshKey={refreshKey}
          />

          <PeopleSection
            title="Outside collaborators"
            subtitle={`${data.seatUsage.used} / ${limitLabel} seats used across all your projects.`}
            rows={[
              ...collaborators.map((member) => ({
                key: `member:${member.user_id}`,
                primary: member.full_name ?? member.email ?? member.user_id,
                secondary: member.email ?? "",
                badge: "collaborator",
              })),
              ...data.pendingInvites.map((invite) => ({
                key: `invite:${invite.id}`,
                primary: invite.email ?? invite.phone ?? "Pending invite",
                secondary: `via ${invite.channel} · sent ${new Date(invite.created_at).toLocaleDateString()}`,
                badge: "pending",
              })),
            ]}
            emptyLabel="No outside collaborators yet."
            refreshKey={refreshKey}
          />
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href={`${basePath}/${data.projectId}/people`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--graphite-primary)] hover:underline"
        >
          Manage all people <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
