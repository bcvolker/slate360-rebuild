import { VNEXT_REVIEW_BANNER } from "@/lib/vnext/copy";

export function VnextReviewBanner() {
  return (
    <p className="m-0 border-b border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-[var(--vnext-pad-x)] py-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
      {VNEXT_REVIEW_BANNER}
    </p>
  );
}
