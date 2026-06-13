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
      className="auth-btn-secondary"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Checking…" : checked ? "Check again" : "Check my status"}
    </button>
  );
}
