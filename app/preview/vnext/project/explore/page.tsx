"use client";

import { useSearchParams } from "next/navigation";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { resolvePreviewExploreData } from "@/lib/vnext/preview-explore-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

const BASE_PATH = "/preview/vnext/project/explore";

/**
 * The one interactive Explore preview route — reads ?rep=/?source=/?present= itself and resolves
 * fixture data via the same decision logic the real page uses, so e2e/vnext/explore.spec.ts can
 * drive representation switching, deep links, and Back/Forward without an authenticated session
 * (this suite tests every other vNext page the same way; see e2e/vnext/routes.spec.ts).
 */
export default function PreviewVnextProjectExplorePage() {
  const searchParams = useSearchParams();
  const data = resolvePreviewExploreData(searchParams.get("rep"), searchParams.get("source"));
  const present = searchParams.get("present") === "1";

  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[1].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextExploreShell data={data} initialPresent={present} basePath={BASE_PATH} />
    </VnextClientShell>
  );
}
