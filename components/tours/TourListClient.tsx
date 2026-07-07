"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { StudioWorkspaceShell } from "@/components/studio/StudioWorkspaceShell";
import { TourImportZone } from "./TourImportZone";
import { TourCard } from "./TourCard";
import type { TourMobileProject } from "./mobile/TourMobileProjectPicker";

type TourRow = { id: string; title: string; status: "draft" | "published"; updated_at: string };

interface TourListClientProps {
  onSelectTour: (tourId: string, pendingFiles?: FileList) => void;
}

export function TourListClient({ onSelectTour }: TourListClientProps) {
  const [tours, setTours] = useState<TourRow[]>([]);
  const [projects, setProjects] = useState<TourMobileProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTours = useCallback(async () => {
    const res = await fetch("/api/tours");
    if (res.ok) {
      const data = await res.json();
      setTours(data.data ?? data ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchTours(),
          fetch("/api/projects")
            .then((r) => (r.ok ? r.json() : { projects: [] }))
            .then((json) => setProjects(json.projects ?? [])),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchTours]);

  async function handleDelete(tourId: string) {
    const res = await fetch(`/api/tours/${tourId}`, { method: "DELETE" });
    if (res.ok) setTours((prev) => prev.filter((t) => t.id !== tourId));
  }

  return (
    <StudioWorkspaceShell title="360° Tours" subtitle={loading ? undefined : `${tours.length} tour${tours.length === 1 ? "" : "s"}`}>
      <div className="h-full space-y-6 overflow-y-auto p-5">
        <TourImportZone projects={projects} onCreated={(tourId, files) => onSelectTour(tourId, files)} />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-[var(--graphite-muted)]" />
          </div>
        ) : tours.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--graphite-muted)]">
            No tours yet — drop your first 360° panoramas above to get started.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onSelect={() => onSelectTour(tour.id)}
                onDelete={() => handleDelete(tour.id)}
              />
            ))}
          </div>
        )}
      </div>
    </StudioWorkspaceShell>
  );
}
