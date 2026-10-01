"use client";

import { useState } from "react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { formatVisitDate } from "@/lib/spatial-tour/format";
import type { TourVisit } from "@/lib/spatial-tour/types";

/** First step: name the route and pick the visit whose walk defines it. */
export function TourCreateRoute({
  visits,
  busy,
  message,
  onCreate,
}: {
  visits: TourVisit[];
  busy: boolean;
  message: string | null;
  onCreate: (name: string, fromWalkthroughId: string) => void;
}) {
  const usable = visits.filter((v) => v.clips.some((c) => c.hasPublicProxy));
  const [name, setName] = useState("");
  const [from, setFrom] = useState(usable[0]?.walkthroughId ?? "");

  return (
    <section className={t.sectionCard} data-testid="tour-create-route">
      <p className={t.eyebrow}>Directed Tour route</p>
      <p className="mt-2 text-sm text-[var(--graphite-muted)]">
        A route is the path every visit follows, with checkpoints you return to each time. Clients compare visits at those checkpoints.
      </p>
      {usable.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--graphite-muted)]">
          Upload a walkthrough and run its privacy bake first. The route is defined from a processed visit.
        </p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && from) onCreate(name.trim(), from);
          }}
        >
          <input
            className="min-h-11 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 text-sm text-[var(--graphite-text-header)]"
            placeholder="Route name, e.g. Level 1 full walk"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Route name"
          />
          <select
            className="min-h-11 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 text-sm text-[var(--graphite-text-header)]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Visit that defines the route"
          >
            {usable.map((v) => (
              <option key={v.walkthroughId} value={v.walkthroughId}>
                {formatVisitDate(v.capturedAt)} · {v.title}
              </option>
            ))}
          </select>
          <button type="submit" className={t.primaryButton} disabled={busy || !name.trim() || !from}>
            Create route
          </button>
          {message ? <p className="text-sm text-[var(--destructive)]" role="alert">{message}</p> : null}
        </form>
      )}
    </section>
  );
}
