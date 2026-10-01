"use client";

import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

export default function PreviewVnextOwnerMenuPage() {
  return (
    <VnextOwnerShell pathname="/vnext/ops" initialMenuOpen>
      <VnextPageScaffold title="Home" note={VNEXT_OWNER_NOTE} />
    </VnextOwnerShell>
  );
}
