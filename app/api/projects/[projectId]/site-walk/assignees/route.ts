import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";

type MemberRow = { user_id: string; role: string | null };
type StakeholderRow = { id: string; name: string; role: string | null; company: string | null; email: string | null; status: string | null };
type ProfileRow = { id: string; email: string | null; full_name: string | null; display_name: string | null };
type AssigneeOption = { id: string; label: string; subtitle: string; assignable: boolean; source: "project_member" | "stakeholder" };

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const [{ data: members, error: memberError }, { data: stakeholders, error: stakeholderError }] = await Promise.all([
      admin.from("project_members").select("user_id, role").eq("project_id", projectId),
      admin.from("project_stakeholders").select("id, name, role, company, email, status").eq("project_id", projectId).order("created_at", { ascending: false }),
    ]);

    if (memberError) return serverError(memberError.message);
    if (stakeholderError) return serverError(stakeholderError.message);

    const memberRows = (members ?? []) as MemberRow[];
    const stakeholderRows = ((stakeholders ?? []) as StakeholderRow[]).filter((row) => row.status !== "Inactive");
    const memberIds = memberRows.map((row) => row.user_id);
    const stakeholderEmails = stakeholderRows.map((row) => row.email?.toLowerCase()).filter(isString);

    const profileIds = new Set(memberIds);
    const profilesByEmail = new Map<string, ProfileRow>();
    const profilesById = new Map<string, ProfileRow>();

    if (memberIds.length > 0) {
      const { data, error } = await admin.from("profiles").select("id, email, full_name, display_name").in("id", memberIds);
      if (error) return serverError(error.message);
      for (const profile of (data ?? []) as ProfileRow[]) {
        profilesById.set(profile.id, profile);
        if (profile.email) profilesByEmail.set(profile.email.toLowerCase(), profile);
      }
    }

    if (stakeholderEmails.length > 0) {
      const { data, error } = await admin.from("profiles").select("id, email, full_name, display_name").in("email", stakeholderEmails);
      if (error) return serverError(error.message);
      for (const profile of (data ?? []) as ProfileRow[]) {
        profilesById.set(profile.id, profile);
        if (profile.email) profilesByEmail.set(profile.email.toLowerCase(), profile);
      }
    }

    const assignees: AssigneeOption[] = memberRows.map((row) => {
      const profile = profilesById.get(row.user_id);
      return {
        id: row.user_id,
        label: profile?.full_name ?? profile?.display_name ?? profile?.email ?? "Project member",
        subtitle: row.role ?? "member",
        assignable: true,
        source: "project_member",
      };
    });

    for (const stakeholder of stakeholderRows) {
      const matchedProfile = stakeholder.email ? profilesByEmail.get(stakeholder.email.toLowerCase()) : undefined;
      if (matchedProfile && !profileIds.has(matchedProfile.id)) {
        profileIds.add(matchedProfile.id);
        assignees.push({
          id: matchedProfile.id,
          label: stakeholder.name,
          subtitle: [stakeholder.role, stakeholder.company].filter(isString).join(" · ") || "stakeholder",
          assignable: true,
          source: "stakeholder",
        });
      } else if (!matchedProfile) {
        assignees.push({
          id: stakeholder.id,
          label: stakeholder.name,
          subtitle: [stakeholder.role, stakeholder.company, stakeholder.email].filter(isString).join(" · ") || "stakeholder",
          assignable: false,
          source: "stakeholder",
        });
      }
    }

    return ok({ assignees });
  }, "id, name, org_id");

function isString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
