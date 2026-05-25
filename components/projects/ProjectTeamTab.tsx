"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { MobileEmptyState, MobileSection } from "@/components/mobile-system";
import { CollaboratorInviteModal } from "@/components/projects/CollaboratorInviteModal";
import { PeopleSection } from "@/components/projects/PeopleSection";
import type { ProjectTeamTabData } from "@/lib/projects/team-tab-data";

type ProjectTeamTabProps = {
  data: ProjectTeamTabData;
  basePath: "/projects" | "/project-hub";
  canManage: boolean;
};

export function ProjectTeamTab({ data, basePath, canManage }: ProjectTeamTabProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((key) => key + 1);

  const teammates = data.members.filter(
    (member) => member.role !== "collaborator" && member.role !== "viewer",
  );
  const collaborators = data.members.filter((member) => member.role === "collaborator");
  const limitLabel = data.seatUsage.limit === null ? "∞" : String(data.seatUsage.limit);
  const atLimit =
    data.seatUsage.limit !== null && data.seatUsage.used >= data.seatUsage.limit;
  const peopleHref = `${basePath}/${data.projectId}/people`;
  const totalPeople =
    teammates.length + collaborators.length + data.pendingInvites.length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
              Team
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">People on this project</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {totalPeople > 0
                ? `${totalPeople} member${totalPeople === 1 ? "" : "s"} and invite${data.pendingInvites.length === 1 ? "" : "s"} on this project.`
                : "Invite teammates and collaborators to work on this project."}
            </p>
          </div>
          {canManage ? (
            <CollaboratorInviteModal
              projectId={data.projectId}
              disabled={atLimit}
              onInvited={refresh}
              triggerLabel={atLimit ? "Collaborator limit reached" : "+ Invite collaborator"}
            />
          ) : null}
        </div>
      </section>

      {totalPeople === 0 ? (
        <MobileEmptyState
          icon={Users}
          title="No team members yet"
          description="Invite collaborators or assign teammates to start working on this project."
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-10"
        />
      ) : (
        <>
          <MobileSection label="Project members" showAccentLine="warm">
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
          </MobileSection>

          <MobileSection label="Outside collaborators" showAccentLine="cool">
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
          </MobileSection>
        </>
      )}

      <div className="flex justify-end">
        <Link
          href={peopleHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
        >
          Manage all people <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
