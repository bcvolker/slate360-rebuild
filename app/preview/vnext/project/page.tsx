"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextProjectScaffold } from "@/components/vnext/portfolio/VnextProjectScaffold";
import { PREVIEW_SCAFFOLD_PROJECT } from "@/lib/vnext/preview-portfolio-fixtures";

export default function PreviewVnextProjectPage() {
  return (
    <VnextClientShell pathname={PREVIEW_SCAFFOLD_PROJECT.navPath}>
      <VnextProjectScaffold name={PREVIEW_SCAFFOLD_PROJECT.name} />
    </VnextClientShell>
  );
}
