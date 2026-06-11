"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { buildCaptureV2SummaryUrl } from "@/lib/site-walk/capture-v2-config";

type Props = {
  sessionId: string;
};

export function CaptureV2SummarySavedBanner({ sessionId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!searchParams || searchParams.get("finished") !== "1") return;

    const rawSaved = searchParams.get("saved");
    const parsed = rawSaved == null ? 0 : Number.parseInt(rawSaved, 10);
    const count = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setSavedCount(count);

    router.replace(buildCaptureV2SummaryUrl(sessionId), { scroll: false });
  }, [router, searchParams, sessionId]);

  if (savedCount == null) return null;

  const stopLabel = savedCount === 1 ? "stop" : "stops";

  return (
    <div
      role="status"
      data-walk-review="saved-banner"
      className="mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
      <p className="text-sm font-semibold text-emerald-100">
        Walk saved · {savedCount} {stopLabel}
      </p>
    </div>
  );
}
