"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { VnextProjectOverview } from "@/components/vnext/project/VnextProjectOverview";
import { PREVIEW_OVERVIEW_SPARSE, PREVIEW_OVERVIEW_SPARSE_NAV_PATH } from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectSparsePage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_SPARSE_NAV_PATH}>
      <VnextProjectNav projectId={PREVIEW_OVERVIEW_SPARSE.id} pathname={PREVIEW_OVERVIEW_SPARSE_NAV_PATH} />
      <VnextProjectOverview overview={PREVIEW_OVERVIEW_SPARSE} />
    </VnextClientShell>
  );
}
