import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, forbidden } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

type FeedbackStatus = "new" | "triaged" | "in_progress" | "resolved" | "wont_fix" | "duplicate";

interface FeedbackRow {
  id: string;
  user_id: string | null;
  type: string;
  severity: string | null;
  title: string;
  description: string;
  status: FeedbackStatus;
  created_at: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

function mapTypeToCategory(type: string): "bug" | "suggestion" | "other" {
  if (type === "bug") return "bug";
  if (type === "feature") return "suggestion";
  return "other";
}

function fullName(p: ProfileRow | undefined): string | null {
  if (!p) return null;
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

export const GET = (req: NextRequest) =>
  withAuth(req, async () => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("beta_feedback")
      .select("id, user_id, type, severity, title, description, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<FeedbackRow[]>();

    if (error) {
      console.error("[/api/operations/feedback] supabase error:", error);
      return ok({ feedback: [] });
    }

    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)));

    const profileMap = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profiles, error: profErr } = await admin
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds)
        .returns<ProfileRow[]>();
      if (profErr) {
        console.error("[/api/operations/feedback] profile lookup error:", profErr);
      } else {
        for (const p of profiles ?? []) profileMap.set(p.id, p);
      }
    }

    const feedback = rows.map((row) => {
      const profile = row.user_id ? profileMap.get(row.user_id) : undefined;
      return {
        id: row.id,
        category: mapTypeToCategory(row.type),
        type: row.type,
        title: row.title,
        description: row.description,
        severity: row.severity,
        status: row.status,
        created_at: row.created_at,
        user_email: profile?.email ?? null,
        user_name: fullName(profile),
      };
    });

    return ok({ feedback });
  });
