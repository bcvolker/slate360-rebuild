import "server-only";

import { getScopedProjectForUser } from "@/lib/projects/access";
import { ITEMS_LOAD_ERROR } from "./item-language";
import { readItemQuestions } from "./item-questions";
import { readProjectItem, readProjectItems } from "./read-project-items";
import { buildExploreItemFocus } from "./derive-locators";
import type { VnextClientItem, VnextExploreItemFocus, VnextItemQuestion } from "./item-types";
import { canClientSeeCapability } from "@/lib/vnext/scope/resolve-client-scope";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";

export type ItemsPageResult =
  | { access: "denied" }
  | { access: "hidden" }
  | { access: "ok"; items: VnextClientItem[]; error: string | null };

export async function loadVnextProjectItems(userId: string, projectId: string): Promise<ItemsPageResult> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return { access: "denied" };
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "items")) return { access: "hidden" };
  const read = await readProjectItems(admin, projectId);
  if (!read.ok) return { access: "ok", items: [], error: read.error };
  return { access: "ok", items: read.items, error: null };
}

export type ItemDetailResult =
  | { access: "denied" }
  | { access: "missing" }
  | { access: "error"; message: string }
  | { access: "ok"; item: VnextClientItem; questions: VnextItemQuestion[] };

export async function loadVnextItemDetail(
  userId: string,
  projectId: string,
  itemId: string,
): Promise<ItemDetailResult> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return { access: "denied" };
  const scope = await readClientScope(admin, projectId);
  if (!canClientSeeCapability(scope, "items")) return { access: "missing" };
  const read = await readProjectItem(admin, projectId, itemId);
  if (!read.ok) return { access: "error", message: read.error };
  if (!read.item) return { access: "missing" };
  const questions = await readItemQuestions(admin, projectId, itemId);
  if (!questions.ok && questions.status === "error") {
    return { access: "error", message: ITEMS_LOAD_ERROR };
  }
  return {
    access: "ok",
    item: read.item,
    questions: questions.ok ? questions.questions : [],
  };
}

export async function loadExploreItemFocus(
  userId: string,
  projectId: string,
  itemId: string,
  activeRepresentation: string | null,
  activeSourceId: string | null,
): Promise<VnextExploreItemFocus | null> {
  const { admin, project } = await getScopedProjectForUser(userId, projectId, "id");
  if (!project) return null;
  const read = await readProjectItem(admin, projectId, itemId);
  if (!read.ok || !read.item) return null;
  const item = read.item;
  return buildExploreItemFocus({
    itemId: item.id,
    title: item.title,
    statusLabel: item.statusLabel,
    locationLabel: item.locationLabel,
    dateLabel: item.dateLabel,
    detailHref: `/vnext/projects/${projectId}/items/${item.id}`,
    locators: item.locators,
    activeRepresentation,
    activeSourceId,
  });
}
