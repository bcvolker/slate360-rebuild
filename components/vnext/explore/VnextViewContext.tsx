"use client";

import { formatPlainDate } from "@/lib/vnext/overview-visit";
import { REPRESENTATION_LABEL } from "@/lib/vnext/project-hero";
import type { VnextSavedView } from "@/lib/vnext/views/saved-view-types";

export function VnextViewContext({ view }: { view: VnextSavedView }) {
  const date = formatPlainDate(view.occurredAt);
  return (
    <p
      className="absolute left-3 top-3 z-10 m-0 max-w-[70%] border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-3 py-2 text-[length:var(--vnext-meta)] text-[var(--vnext-ink)]"
      data-vnext-view-context="true"
    >
      <span className="block font-medium" data-vnext-view-title="true">
        {view.title}
      </span>
      {date ? (
        <span className="block" data-vnext-view-date="true">
          {date}
        </span>
      ) : null}
      <span className="block">{REPRESENTATION_LABEL[view.representation]}</span>
    </p>
  );
}
