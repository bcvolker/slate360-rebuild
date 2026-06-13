import { Loader2 } from "lucide-react";

export default function CaptureV2SummaryLoading() {
  return (
    <main className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[#0B0F15] text-white">
      <Loader2 className="h-9 w-9 animate-spin text-[var(--graphite-primary)]" strokeWidth={1.75} />
      <p className="text-sm font-semibold text-slate-300">Saving walk &amp; loading review…</p>
    </main>
  );
}
