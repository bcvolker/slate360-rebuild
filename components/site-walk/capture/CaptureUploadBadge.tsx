"use client";

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  kind: string;
};

export function CaptureUploadBadge({ kind }: Props) {
  const active = kind === "uploading" || kind === "saving";
  const error = kind === "error";
  return (
    <div className={cn("absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border bg-black/60 text-white shadow-xl backdrop-blur-xl", error ? "border-red-400/60" : "border-white/15")} aria-label={active ? "Uploading capture" : error ? "Capture upload error" : "Capture upload ready"}>
      {active ? <Loader2 className="h-5 w-5 animate-spin text-[var(--graphite-primary)]" /> : error ? <AlertTriangle className="h-5 w-5 text-red-300" /> : <Check className="h-5 w-5 text-[var(--graphite-primary)]" />}
    </div>
  );
}