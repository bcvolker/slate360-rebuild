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
      type="button"
      onClick={handleRecheck}
      disabled={isPending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/40 hover:text-amber-200 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Checking…" : checked ? "Check again" : "Check my status"}
    </button>
  );
}
