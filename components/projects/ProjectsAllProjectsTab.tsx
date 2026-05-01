"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, Loader2, MapPin, MoreVertical, Trash2 } from "lucide-react";
import { resolveProjectLocation } from "@/lib/projects/location";
import type { ProjectListItem } from "@/lib/types/projects";

type Props = {
  loading: boolean;
  projects: ProjectListItem[];
  onOpenDeleteProject: (project: { id: string; name: string }) => void;
};

export default function ProjectsAllProjectsTab({ loading, projects, onOpenDeleteProject }: Props) {
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center rounded-3xl border border-white/10 bg-white/5 p-16 text-slate-400 shadow-lg backdrop-blur-md">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center shadow-lg backdrop-blur-md">
        <FolderKanban className="mx-auto h-8 w-8 text-blue-200" />
        <p className="mt-3 text-sm font-black text-white">Create your first project</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-400">Projects organize Site Walks, files, contacts, deliverables, and field activity.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
        const resolvedLocation = resolveProjectLocation(project.metadata, {
          legacyLocation: project.location,
          city: project.city,
          state: project.state,
          region: project.region,
        });
        const pLat = resolvedLocation.lat;
        const pLng = resolvedLocation.lng;
        const staticMapUrl =
          pLat !== null && pLng !== null && mapsKey
            ? `https://maps.googleapis.com/maps/api/staticmap?center=${pLat},${pLng}&zoom=16&size=600x300&scale=2&maptype=satellite&key=${mapsKey}`
            : null;

        return (
          <div
            key={project.id}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-md transition-all hover:border-blue-400/70 hover:bg-blue-500/10"
          >
            <Link href={`/projects/${project.id}`} className="block">
              <div className="relative h-32 w-full overflow-hidden">
                {staticMapUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${staticMapUrl})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-800" />
                )}
                {staticMapUrl && <div className="absolute inset-0 bg-black/45" />}
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200 backdrop-blur-md">
                      <MapPin className="h-3 w-3 text-blue-200" /> {resolvedLocation.label || "No location"}
                    </span>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                      {project.status ?? "active"}
                    </span>
                  </div>
                  <h2 className="truncate text-xl font-black text-white">{project.name}</h2>
                </div>
              </div>
            </Link>

            <div className="absolute top-2 left-2 z-10">
              <button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setCardMenuOpen(cardMenuOpen === project.id ? null : project.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/45 text-slate-200 backdrop-blur-md transition-all hover:bg-white/15"
                title="Project options"
              >
                <MoreVertical size={14} />
              </button>

              {cardMenuOpen === project.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCardMenuOpen(null)} />
                  <div className="absolute left-0 top-10 z-50 w-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 py-1 shadow-2xl">
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onOpenDeleteProject({ id: project.id, name: project.name });
                        setCardMenuOpen(null);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-950/50 transition-colors text-left"
                    >
                      <Trash2 size={14} /> Delete Project
                    </button>
                  </div>
                </>
              )}
            </div>

            <Link href={`/projects/${project.id}`} className="flex min-h-32 flex-col justify-between p-4">
              <p className="line-clamp-2 text-sm leading-6 text-slate-400">{project.description || "No description yet."}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-semibold text-slate-500">
                <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                <span className="inline-flex items-center gap-1 text-blue-200">Open <ChevronRight className="h-3.5 w-3.5" /></span>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
