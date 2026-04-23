"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

export default function BetaPendingRecheck() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState(false);

  function handleRecheck() {
    setChecked(true);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRecheck}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-md border border-app bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/[0.06] hover:text-foreground transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending
        ? "Checking…"
        : checked
          ? "Check again"
          : "Check my status"}
    </button>
  );
}
