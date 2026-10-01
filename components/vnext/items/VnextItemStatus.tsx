import type { VnextItemStatusTone } from "@/lib/vnext/items/item-types";

const TONE_COLOR: Record<VnextItemStatusTone, string> = {
  attention: "var(--vnext-accent)",
  done: "var(--vnext-success)",
  neutral: "var(--vnext-ink-muted)",
};

export function VnextItemStatus({ label, tone }: { label: string; tone: VnextItemStatusTone }) {
  return (
    <span className="inline-flex items-center gap-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]">
      <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0" style={{ background: TONE_COLOR[tone] }} />
      {label}
    </span>
  );
}
