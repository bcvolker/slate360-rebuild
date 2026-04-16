"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MoreVertical, Trash2 } from "lucide-react";
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
      <div className="flex justify-center p-20 text-zinc-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-20 text-center text-zinc-400">
        No projects found. Click "New Project" to start building.
      </div>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
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
            className="group relative flex w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:-translate-y-1 transition-all"
          >
            <Link href={`/projects/${project.id}`} className="block">
              <div className="h-32 w-full relative overflow-hidden">
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
                    <span />
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md uppercase tracking-wider">
                      {project.status ?? "active"}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white truncate">{project.name}</h2>
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
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/20 hover:bg-white/40 backdrop-blur-md transition-all text-white"
                title="Project options"
              >
                <MoreVertical size={14} />
              </button>

              {cardMenuOpen === project.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCardMenuOpen(null)} />
                  <div className="absolute left-0 top-9 z-50 w-48 rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl py-1 overflow-hidden">
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

            <Link href={`/projects/${project.id}`} className="p-5 flex-1 flex flex-col justify-between">
              <p className="text-sm text-zinc-400 line-clamp-2">{project.description || "No description provided."}</p>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between text-xs font-semibold text-zinc-500">
                <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                <span className="text-[#D4AF37] group-hover:underline">Open Project →</span>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
