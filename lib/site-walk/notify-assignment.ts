/**
 * lib/site-walk/notify-assignment.ts
 * Central helper to notify a user when they're assigned to a Site Walk
 * task or item. Inserts an in-app project_notification AND sends email.
 *
 * Fire-and-forget — caller should `void notifyAssignment(...)` so failures
 * don't break the underlying API.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAssignmentNotificationEmail, type AssignmentEmailKind } from "@/lib/email-assignments";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

interface NotifyArgs {
  kind: AssignmentEmailKind;
  sessionId: string;
  assigneeUserId: string;
  assignerUserId: string;
  title: string;
  message?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  itemId?: string | null;
}

interface ProfileLookup {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface SessionLookup {
  id: string;
  project_id: string;
  title: string | null;
}

interface ProjectLookup {
  id: string;
  name: string | null;
}

/**
 * Notify a user about a new assignment. Best-effort — never throws.
 */
export async function notifyAssignment(args: NotifyArgs): Promise<void> {
  // Don't notify yourself
  if (args.assigneeUserId === args.assignerUserId) return;

  const admin = createAdminClient();

  try {
    const [{ data: assignee }, { data: assigner }, { data: session }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", args.assigneeUserId)
        .maybeSingle<ProfileLookup>(),
      admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", args.assignerUserId)
        .maybeSingle<ProfileLookup>(),
      admin
        .from("site_walk_sessions")
        .select("id, project_id, title")
        .eq("id", args.sessionId)
        .maybeSingle<SessionLookup>(),
    ]);

    if (!assignee || !session) return;

    let projectName: string | null = null;
    if (session.project_id) {
      const { data: project } = await admin
        .from("projects")
        .select("id, name")
        .eq("id", session.project_id)
        .maybeSingle<ProjectLookup>();
      projectName = project?.name ?? null;
    }

    const linkPath = args.itemId
      ? `/site-walk/items/${args.itemId}`
      : `/site-walk/walks/active/${args.sessionId}`;

    // 1) In-app notification (best-effort)
    if (session.project_id) {
      try {
        await admin.from("project_notifications").insert({
          user_id: args.assigneeUserId,
          project_id: session.project_id,
          title: args.kind === "task"
            ? `New task assigned: ${args.title}`
            : `New punch item assigned: ${args.title}`,
          message: args.message
            ? args.message
            : `${assigner?.full_name ?? "A teammate"} assigned this to you${
                args.dueDate ? ` (due ${new Date(args.dueDate).toLocaleDateString()})` : ""
              }.`,
          link_path: linkPath,
          is_read: false,
        });
      } catch (err) {
        console.error("[notify-assignment] in-app insert failed", err);
      }
    }

    // 2) Email (best-effort)
    if (assignee.email) {
      try {
        await sendAssignmentNotificationEmail({
          kind: args.kind,
          to: assignee.email,
          recipientName: assignee.full_name ?? undefined,
          assignerName: assigner?.full_name ?? "A Slate360 user",
          title: args.title,
          message: args.message ?? undefined,
          priority: args.priority ?? undefined,
          dueDate: args.dueDate ?? undefined,
          link: `${APP_URL}${linkPath}`,
          projectName,
        });
      } catch (err) {
        console.error("[notify-assignment] email send failed", err);
      }
    }
  } catch (err) {
    console.error("[notify-assignment] lookup failed", err);
  }
}
