"use client";

import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_CLIENT_NOTE } from "@/lib/vnext/copy";

export default function PreviewVnextClientPage() {
  return (
    <VnextClientShell pathname="/vnext/projects">
      <VnextPageScaffold title="Projects" note={VNEXT_CLIENT_NOTE} />
    </VnextClientShell>
  );
}
