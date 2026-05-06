import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";

type DbRow = Record<string, unknown>;
type MemberRow = { userId: string; roleLabel: string };
type StakeholderRow = { id: string; name: string; role: string | null; company: string | null; email: string | null; status: string | null };
type ProfileRow = { id: string; email: string | null; label: string };
type AssigneeOption = { id: string; label: string; subtitle: string; assignable: boolean; source: "project_member" | "stakeholder" };

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const [{ data: members, error: memberError }, { data: stakeholders, error: stakeholderError }] = await Promise.all([
      admin.from("project_members").select("*").eq("project_id", projectId),
      admin.from("project_stakeholders").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    ]);

    if (memberError) console.warn("[assignees] project_members unavailable", memberError.message);
    if (stakeholderError) console.warn("[assignees] project_stakeholders unavailable", stakeholderError.message);

    const memberRows = ((members ?? []) as DbRow[])
      .map(toMemberRow)
      .filter((row): row is MemberRow => Boolean(row));
    const stakeholderRows = ((stakeholders ?? []) as DbRow[])
      .map(toStakeholderRow)
      .filter((row): row is StakeholderRow => row !== null && row.status?.toLowerCase() !== "inactive");
    const memberIds = memberRows.map((row) => row.userId);
    const stakeholderEmails = stakeholderRows.map((row) => row.email?.toLowerCase()).filter(isString);

    const profileIds = new Set(memberIds);
    const profilesByEmail = new Map<string, ProfileRow>();
    const profilesById = new Map<string, ProfileRow>();

    if (memberIds.length > 0) {
      const { data, error } = await admin.from("profiles").select("*").in("id", memberIds);
      if (error) console.warn("[assignees] profile id lookup unavailable", error.message);
      for (const profile of ((data ?? []) as DbRow[]).map(toProfileRow).filter((row): row is ProfileRow => Boolean(row))) {
        profilesById.set(profile.id, profile);
        if (profile.email) profilesByEmail.set(profile.email.toLowerCase(), profile);
      }
    }

    if (stakeholderEmails.length > 0) {
      const { data, error } = await admin.from("profiles").select("*").in("email", stakeholderEmails);
      if (error) console.warn("[assignees] profile email lookup unavailable", error.message);
      for (const profile of ((data ?? []) as DbRow[]).map(toProfileRow).filter((row): row is ProfileRow => Boolean(row))) {
        profilesById.set(profile.id, profile);
        if (profile.email) profilesByEmail.set(profile.email.toLowerCase(), profile);
      }
    }

    const assignees: AssigneeOption[] = memberRows.map((row) => {
      const profile = profilesById.get(row.userId);
      return {
        id: row.userId,
        label: profile?.label ?? profile?.email ?? "Project member",
        subtitle: row.roleLabel,
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

function toMemberRow(row: DbRow): MemberRow | null {
  const userId = getString(row, "user_id");
  if (!userId) return null;
  return { userId, roleLabel: getString(row, "role") ?? getString(row, "role_id") ?? "member" };
}

function toStakeholderRow(row: DbRow): StakeholderRow | null {
  const id = getString(row, "id");
  const name = getString(row, "display_name") ?? getString(row, "name") ?? getString(row, "email");
  if (!id || !name) return null;
  return {
    id,
    name,
    role: getString(row, "role"),
    company: getString(row, "company"),
    email: getString(row, "email"),
    status: getString(row, "status"),
  };
}

function toProfileRow(row: DbRow): ProfileRow | null {
  const id = getString(row, "id");
  if (!id) return null;
  const email = getString(row, "email");
  const firstName = getString(row, "first_name");
  const lastName = getString(row, "last_name");
  const fullName = [firstName, lastName].filter(isString).join(" ");
  return {
    id,
    email,
    label: getString(row, "display_name") ?? (fullName || null) ?? email ?? "Project member",
  };
}

function getString(row: DbRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
