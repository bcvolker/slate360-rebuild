"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Loader2, MapPinned } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  createMapSnapshotPdf,
  saveMapSnapshotToDocuments,
} from "@/lib/projects/map-snapshot";
import type { ProjectMapsTabData } from "@/lib/projects/maps-tab-data";
import {
  ProjectSiteLocationMap,
  type MapViewport,
} from "@/components/project-hub/tools/maps/ProjectSiteLocationMap";

type ProjectMapsViewProps = ProjectMapsTabData;

export function ProjectMapsView({
  projectId,
  projectName,
  location,
}: ProjectMapsViewProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [viewport, setViewport] = useState<MapViewport | null>(
    location.center ? { center: location.center, zoom: 16 } : null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (isMobile) {
      router.replace(`/project-hub/${projectId}/tools`);
    }
  }, [isMobile, projectId, router]);

  const handleViewportChange = useCallback((next: MapViewport) => {
    setViewport(next);
  }, []);

  const handleMapSnapshot = async () => {
    if (!location.center || !viewport) {
      setStatus({ ok: false, text: "Map viewport is not ready yet." });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const { blob, filename } = await createMapSnapshotPdf({
        projectName,
        address: location.label,
        center: viewport.center,
        zoom: viewport.zoom,
        boundary: location.boundary,
      });
      await saveMapSnapshotToDocuments(projectId, blob, filename);
      setStatus({ ok: true, text: "Map snapshot saved to Documents." });
    } catch (error) {
      console.error("[ProjectMapsView] snapshot failed:", error);
      setStatus({
        ok: false,
        text: error instanceof Error ? error.message : "Failed to save map snapshot.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isMobile) return null;

  return (
    <div className="space-y-6">
      <header className="glass-card border-[rgba(203,213,225,0.14)] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <Link
              href={`/project-hub/${projectId}/tools`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-300"
            >
              <ArrowLeft size={14} />
              Back to tools
            </Link>
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(203,213,225,0.2)] bg-[rgba(203,213,225,0.08)] text-teal">
                <MapPinned size={20} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal/70">
                  Maps & Site Location
                </p>
                <h1 className="mt-1 text-xl font-black text-zinc-100 sm:text-2xl">{projectName}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  {location.label || "Review the saved site pin and boundary for this project."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => void handleMapSnapshot()}
              disabled={!location.center || isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:border-amber-500/45 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              Map Snapshot
            </button>
            <p className="text-[11px] text-zinc-500">Saved to SlateDrop / Documents</p>
          </div>
        </div>

        {status && (
          <p
            className={`mt-4 text-sm font-medium ${status.ok ? "text-teal" : "text-red-400"}`}
            role="status"
          >
            {status.text}
          </p>
        )}
      </header>

      <section className="glass-card border-[rgba(203,213,225,0.14)] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-200">Site map</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Read-only view of the project pin and saved boundary.
            </p>
          </div>
          {location.center && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-400">
              <div>
                <dt className="uppercase tracking-wide text-zinc-500">Latitude</dt>
                <dd className="font-mono text-zinc-300">{location.center.lat.toFixed(6)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide text-zinc-500">Longitude</dt>
                <dd className="font-mono text-zinc-300">{location.center.lng.toFixed(6)}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="h-[min(68vh,640px)] min-h-[420px]">
          <ProjectSiteLocationMap location={location} onViewportChange={handleViewportChange} />
        </div>
      </section>
    </div>
  );
}
