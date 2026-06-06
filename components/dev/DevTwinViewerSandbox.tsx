"use client";

import { TwinModelViewer } from "@/components/digital-twin/TwinModelViewer";
import { TwinViewerDisclaimer } from "@/components/digital-twin/TwinViewerDisclaimer";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import {
  MOCK_TWIN_JOBS,
  MOCK_TWIN_MODELS,
  MOCK_TWIN_SHARE,
  MOCK_TWIN_SPACE,
} from "@/lib/dev/mock-twin";

export function DevTwinViewerSandbox() {
  const primary = MOCK_TWIN_MODELS.find((m) => m.isPrimary) ?? MOCK_TWIN_MODELS[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div>
        <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
          {MOCK_TWIN_SPACE.title}
        </p>
        <p className="text-xs capitalize text-[var(--graphite-muted)]">
          {MOCK_TWIN_SPACE.status} · {MOCK_TWIN_SPACE.projectName}
        </p>
      </div>

      <div className="min-h-[240px] flex-1 overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)]">
        <TwinModelViewer
          viewerKind="splat"
          modelUrl={primary.storageKey}
          modelTitle={primary.title}
        />
      </div>

      <TwinViewerDisclaimer className="text-[11px] text-[var(--graphite-muted)]" />

      <div className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-3 text-xs">
        <p className={twinAccent.textMuted}>Mock processing queue</p>
        <ul className="mt-2 space-y-1 text-[var(--graphite-text-body)]">
          {MOCK_TWIN_JOBS.map((job) => (
            <li key={job.id} className="flex justify-between gap-2">
              <span className="capitalize">{job.status}</span>
              <span className="text-[var(--graphite-muted)]">{job.progress}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_6%,var(--surface-zinc))] p-3 text-xs">
        <p className={twinAccent.text}>Mock share token</p>
        <p className="mt-1 break-all font-mono text-[var(--graphite-muted)]">
          {MOCK_TWIN_SHARE.token}
        </p>
        <p className="mt-1 text-[var(--graphite-muted)]">
          Role {MOCK_TWIN_SHARE.role} · views {MOCK_TWIN_SHARE.viewCount}/{MOCK_TWIN_SHARE.maxViews}
        </p>
      </div>
    </div>
  );
}
