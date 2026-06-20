import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

/**
 * Aggregated stakeholder questions from interactive thermal share links, for the
 * Operations Console Communications inbox. Returns the questions (not owner replies)
 * across all of the org's sessions, newest first, with session name + status.
 */
export const GET = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    let q = admin
      .from("thermal_analysis_share_questions")
      .select("id, session_id, capture_id, author_name, author_email, body, status, created_at")
      .eq("is_owner_reply", false)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (orgId) q = q.eq("org_id", orgId);
    const { data: questions, error } = await q;
    if (error) return serverError(error.message);

    const rows = questions ?? [];
    const sessionIds = [...new Set(rows.map((r) => r.session_id as string).filter(Boolean))];
    const names = new Map<string, string>();
    if (sessionIds.length) {
      const { data: sessions } = await admin
        .from("thermal_analysis_sessions")
        .select("id, name")
        .in("id", sessionIds);
      (sessions ?? []).forEach((s) => names.set(s.id as string, (s.name as string) ?? "Session"));
    }

    const items = rows.map((r) => ({
      id: r.id,
      kind: "thermal" as const,
      sessionId: r.session_id,
      sessionName: names.get(r.session_id as string) ?? "Thermal session",
      captureId: r.capture_id,
      author: (r.author_name as string) || (r.author_email as string) || "Stakeholder",
      body: r.body,
      status: r.status ?? "new",
      createdAt: r.created_at,
    }));
    const unanswered = items.filter((i) => i.status !== "answered" && i.status !== "resolved").length;

    return ok({ items, unanswered });
  });
