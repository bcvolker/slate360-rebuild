import "server-only";

import { formatPlainDate } from "@/lib/vnext/overview-visit";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { authorLabelFromProfile } from "./author-label";
import { prepareQuestionBody } from "./question-body";
import type { VnextAdmin } from "./read-project-items";
import type { VnextItemQuestion } from "./item-types";

type QuestionResult =
  | { ok: true; questions: VnextItemQuestion[] }
  | { ok: false; status: "missing" | "error" };

type CreateResult =
  | { ok: true; question: VnextItemQuestion }
  | { ok: false; status: "missing" | "invalid" | "error"; reason?: "empty" | "too_long" };

async function itemAnchor(admin: VnextAdmin, projectId: string, itemId: string) {
  let query = admin
    .from("site_walk_items")
    .select("id, session_id, org_id, project_id")
    .eq("project_id", projectId)
    .eq("id", itemId);
  query = excludeDeletedSiteWalkItems(query);
  const { data, error } = await query.maybeSingle();
  if (error || !data?.session_id || !data.org_id) return null;

  const { data: session, error: sessionError } = await admin
    .from("site_walk_sessions")
    .select("id")
    .eq("id", data.session_id)
    .eq("project_id", projectId)
    .maybeSingle();
  if (sessionError || !session) return null;
  return { sessionId: data.session_id, orgId: data.org_id };
}

async function authorLabels(admin: VnextAdmin, authorIds: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (authorIds.length === 0) return labels;
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, first_name, last_name")
    .in("id", authorIds);
  for (const profile of data ?? []) {
    labels.set(profile.id, authorLabelFromProfile(profile));
  }
  return labels;
}

function toQuestion(
  row: { id: string; body: string; created_at: string; author_id: string },
  labels: Map<string, string>,
): VnextItemQuestion {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    dateLabel: formatPlainDate(row.created_at) ?? "",
    authorLabel: labels.get(row.author_id) ?? "Project team",
  };
}

export async function readItemQuestions(
  admin: VnextAdmin,
  projectId: string,
  itemId: string,
): Promise<QuestionResult> {
  const anchor = await itemAnchor(admin, projectId, itemId);
  if (!anchor) return { ok: false, status: "missing" };

  const { data, error } = await admin
    .from("site_walk_comments")
    .select("id, body, created_at, author_id")
    .eq("project_id", projectId)
    .eq("item_id", itemId)
    .eq("session_id", anchor.sessionId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, status: "error" };

  const rows = data ?? [];
  const labels = await authorLabels(admin, [...new Set(rows.map((row) => row.author_id))]);
  return { ok: true, questions: rows.map((row) => toQuestion(row, labels)) };
}

export async function createItemQuestion(
  admin: VnextAdmin,
  projectId: string,
  itemId: string,
  authorId: string,
  rawBody: string,
): Promise<CreateResult> {
  const prepared = prepareQuestionBody(rawBody);
  if (!prepared.ok) return { ok: false, status: "invalid", reason: prepared.reason };

  const anchor = await itemAnchor(admin, projectId, itemId);
  if (!anchor) return { ok: false, status: "missing" };

  const { data, error } = await admin
    .from("site_walk_comments")
    .insert({
      org_id: anchor.orgId,
      project_id: projectId,
      session_id: anchor.sessionId,
      item_id: itemId,
      author_id: authorId,
      body: prepared.body,
      is_field: false,
      is_escalation: false,
      parent_id: null,
    })
    .select("id, body, created_at, author_id")
    .single();
  if (error || !data) return { ok: false, status: "error" };

  const labels = await authorLabels(admin, [authorId]);
  return { ok: true, question: toQuestion(data, labels) };
}
