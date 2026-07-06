import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadTwinSpaceViewerData, loadTwinSpaceStatus } from "@/lib/digital-twin/load-space-viewer";
import { TwinDetailClient } from "@/components/digital-twin/TwinDetailClient";
import { isDigitalTwinDesktopEnabled } from "@/lib/digital-twin/desktop-feature";
import { MobileEmptyState } from "@/components/mobile-system";
import { Boxes, Loader2, AlertTriangle } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export default async function DigitalTwinViewerPage({ params }: Props) {
  const { id } = await params;
  const context = await resolveServerOrgContext();
  const viewer = await loadTwinSpaceViewerData(id, context.orgId);

  if (!viewer) {
    // The viewer is null both when the space is missing AND when it exists but has
    // no ready model yet (still processing / failed). Probe to tell them apart so a
    // user who left and came back mid-reconstruction doesn't hit a false "not found".
    const status = await loadTwinSpaceStatus(id, context.orgId);

    if (status.exists && (status.jobStatus === "queued" || status.jobStatus === "processing" || status.jobStatus === null)) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] text-[var(--twin360-blue)]">
            <Loader2 className="h-7 w-7 animate-spin" strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-100">
              {status.title || "Your twin"} is still building
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-[var(--graphite-muted)]">
              Reconstruction runs in the cloud — usually 20–40 min. We&apos;ll notify you when it&apos;s
              ready to view, edit, and share.
            </p>
          </div>
          {status.captureId ? (
            <Link
              href={`/digital-twin/capture/submit?captureId=${encodeURIComponent(status.captureId)}`}
              className="flex h-11 items-center justify-center rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] px-4 text-sm font-semibold text-[var(--twin360-blue)]"
            >
              View progress
            </Link>
          ) : null}
          <Link href="/digital-twin/twins" className="text-xs font-semibold text-[var(--graphite-muted)] hover:text-zinc-200">
            Back to My Twins
          </Link>
        </div>
      );
    }

    if (status.exists && status.jobStatus === "failed") {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-red-300">
            <AlertTriangle className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-100">Reconstruction couldn&apos;t finish</p>
            <p className="max-w-xs text-xs leading-relaxed text-[var(--graphite-muted)]">
              {status.errorText || "Your capture is safe. Open it from your project to try again."}
            </p>
          </div>
          <Link href="/digital-twin/twins" className="text-xs font-semibold text-[var(--graphite-muted)] hover:text-zinc-200">
            Back to My Twins
          </Link>
        </div>
      );
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <MobileEmptyState
          icon={Boxes}
          title="Twin not found"
          description="This twin may have been removed or you may not have access."
          actionLabel="Back to twins"
          actionHref="/digital-twin/twins"
        />
      </div>
    );
  }

  return (
    <TwinDetailClient
      viewer={{
        spaceId: viewer.spaceId,
        modelId: viewer.modelId,
        viewerKind: viewer.viewerKind,
        modelUrl: viewer.modelUrl,
        modelTitle: viewer.modelTitle,
      }}
      spaceTitle={viewer.spaceTitle}
      spaceStatus={viewer.spaceStatus}
      latestGps={viewer.latestGps}
      desktopEditorEnabled={isDigitalTwinDesktopEnabled()}
    />
  );
}
