"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { VNEXT_DOCUMENTS_SCAFFOLD_NOTE } from "@/lib/vnext/copy";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";

export default function PreviewVnextProjectDocumentsPage() {
  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[3].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextPageScaffold title="Documents" note={VNEXT_DOCUMENTS_SCAFFOLD_NOTE} />
    </VnextClientShell>
  );
}
