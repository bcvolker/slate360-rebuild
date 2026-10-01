import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import type { VnextClientDocument, VnextSearchHit, VnextSearchKind } from "./document-types";

export type SearchItemInput = {
  id: string;
  title: string;
  description: string | null;
  locationLabel: string | null;
  trade: string | null;
  category: string | null;
  tags: string[];
  dateLabel: string;
};

export type SearchPlanInput = {
  id: string;
  label: string;
  sheetNumber: string | null;
  dateLabel: string;
};

function context(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" · ");
}

export function buildProjectSearchHits(input: {
  projectId: string;
  exploreBase: string;
  itemsBase: string;
  documentsBase: string;
  documents: VnextClientDocument[];
  items: SearchItemInput[];
  plans: SearchPlanInput[];
}): VnextSearchHit[] {
  const documents = input.documents.map((document) => ({
    id: document.id,
    kind: "document" as const,
    title: document.displayName,
    context: context(["Document", document.typeLabel, document.folderLabel, document.dateLabel]),
    href: `${input.documentsBase}/${document.id}`,
    searchText: [
      document.displayName,
      document.filename,
      document.typeLabel,
      document.folderLabel,
      document.dateLabel,
      document.related?.title,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));

  const items = input.items.map((item) => ({
    id: item.id,
    kind: "item" as const,
    title: item.title,
    context: context(["Item", item.locationLabel, item.dateLabel]),
    href: `${input.itemsBase}/${item.id}`,
    searchText: [item.title, item.description, item.locationLabel, item.trade, item.category, item.dateLabel, ...item.tags]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));

  const plans = input.plans.map((plan) => ({
    id: plan.id,
    kind: "plan" as const,
    title: plan.label,
    context: context(["Plan", plan.dateLabel]),
    href: vnextExploreHref(input.exploreBase, { rep: "plan", source: plan.id }),
    searchText: [plan.label, plan.sheetNumber, plan.dateLabel, "plan"].filter(Boolean).join(" ").toLowerCase(),
  }));

  return [...documents, ...items, ...plans];
}

export function filterSearchHits(hits: VnextSearchHit[], query: string, kind: "all" | VnextSearchKind): VnextSearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return hits.filter((hit) => {
    if (kind !== "all" && hit.kind !== kind) return false;
    return hit.searchText.includes(needle);
  });
}

export function searchKindsPresent(hits: VnextSearchHit[]): VnextSearchKind[] {
  const order: VnextSearchKind[] = ["document", "item", "plan"];
  return order.filter((kind) => hits.some((hit) => hit.kind === kind));
}
