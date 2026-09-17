"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_OWNER_NOTE } from "@/lib/vnext/copy";

function PreviewOwnerShell() {
  const params = useSearchParams();
  const menu = params?.get("menu") === "1";

  return (
    <VnextOwnerShell pathname="/vnext/ops" initialMenuOpen={menu}>
      <VnextPageScaffold title="Home" note={VNEXT_OWNER_NOTE} />
    </VnextOwnerShell>
  );
}

export default function PreviewVnextOwnerPage() {
  return (
    <Suspense>
      <PreviewOwnerShell />
    </Suspense>
  );
}
