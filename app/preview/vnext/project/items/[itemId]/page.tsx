import { notFound } from "next/navigation";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextItemDetail } from "@/components/vnext/items/VnextItemDetail";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import {
  PREVIEW_EXPLORE_BASE,
  PREVIEW_ITEMS,
  PREVIEW_ITEMS_BASE,
  previewQuestions,
} from "@/lib/vnext/preview-items-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

type PageProps = { params: Promise<{ itemId: string }> };

export default async function PreviewVnextItemDetailPage({ params }: PageProps) {
  const { itemId } = await params;
  const item = PREVIEW_ITEMS.find((entry) => entry.id === itemId);
  if (!item) notFound();

  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[2].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextItemDetail
        item={item}
        itemsHref={PREVIEW_ITEMS_BASE}
        exploreBase={PREVIEW_EXPLORE_BASE}
        questions={previewQuestions(item.id)}
        endpoint={`/api/vnext/projects/${PREVIEW_OVERVIEW_PROJECT.id}/items/${item.id}/questions`}
      />
    </VnextClientShell>
  );
}
