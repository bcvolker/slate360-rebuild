"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  MoreVertical,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import LocationDisplay from "@/components/shared/LocationDisplay";

/* ─── Types ─────────────────────────────────────────────────── */
type ProjectType = "3d" | "360" | "geo" | "plan";

interface ProjectCardProject {
  id: string;
  name: string;
  status?: string;
  type: ProjectType;
  location?: string;
  lastEdited?: string;
  thumbnail?: string;
  lat?: number | null;
  lng?: number | null;
}

interface DashboardProjectCardProps {
  project: ProjectCardProject;
  projectTypeEmoji: (type: ProjectType) => string;
  onDeleted?: () => void;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function DashboardProjectCard({
  project: p,
  projectTypeEmoji,
  onDeleted,
}: DashboardProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmName.trim() !== p.name) {
      setDeleteError("Project name does not match.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE", confirmName: confirmName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete project.");
        return;
      }
      setDeleteModal(false);
      onDeleted?.();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const staticMapUrl = p.lat && p.lng && mapsKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${p.lat},${p.lng}&zoom=16&size=600x300&scale=2&maptype=satellite&key=${mapsKey}`
    : null;

  return (
    <>
      <div className="group snap-start shrink-0 w-[300px] h-[200px] rounded-2xl overflow-hidden relative border border-zinc-800 hover:border-zinc-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Background */}
        <Link href={`/project-hub/${p.id}`} className="absolute inset-0">
          {staticMapUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
              style={{ backgroundImage: `url(${staticMapUrl})` }}
            />
          ) : p.thumbnail ? (
            <div
              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
              style={{ backgroundImage: `url(${p.thumbnail})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
              <span className="text-6xl opacity-30 group-hover:opacity-50 transition-opacity">
                {projectTypeEmoji(p.type)}
              </span>
            </div>
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </Link>

        {/* Status badge */}
        <div className="absolute top-3 right-3 z-[2]">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              p.status === "active"
                ? "bg-emerald-500/90 text-white"
                : p.status === "completed"
                ? "bg-blue-500/90 text-white"
                : "bg-amber-500/90 text-white"
            }`}
          >
            {p.status}
          </span>
        </div>

        {/* 3-dot menu */}
        <div className="absolute top-3 left-3 z-[5]">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/30 hover:bg-black/50 backdrop-blur-md transition-all text-white"
            title="Project options"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-9 z-50 w-48 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl py-1 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setDeleteModal(true);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-950/30 transition-colors text-left"
                >
                  <Trash2 size={14} /> Delete Project
                </button>
              </div>
            </>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute top-3 left-12 z-[2]">
          <span className="text-lg">{projectTypeEmoji(p.type)}</span>
        </div>

        {/* Info */}
        <Link href={`/project-hub/${p.id}`} className="absolute bottom-0 left-0 right-0 p-4 z-[2]">
          <h3 className="text-white font-bold text-base mb-1 group-hover:text-[#FF4D00] transition-colors">
            {p.name}
          </h3>
          <div className="flex items-center gap-3">
            <LocationDisplay
              label={p.location}
              iconSize={10}
              className="flex items-center gap-1"
              textClassName="text-[11px] text-white/60"
            />
            <span className="text-[11px] text-white/40 flex items-center gap-1">
              <Clock size={10} />
              {p.lastEdited}
            </span>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModal(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-red-950/30 border-b border-red-800/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Delete Project</h3>
                    <p className="text-xs text-zinc-400">This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setDeleteModal(false)} className="p-1 rounded-lg hover:bg-red-900/30 transition-colors">
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Project to delete</p>
                  <p className="text-sm font-black text-white">{p.name}</p>
                </div>

                <div className="text-sm text-zinc-300 space-y-2">
                  <p>
                    Deleting this project will <span className="font-bold text-red-400">permanently</span> remove:
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1 ml-4 list-disc">
                    <li>All project files, folders, and uploads</li>
                    <li>RFIs, submittals, daily logs, and punch list items</li>
                    <li>Budget data, schedule, and stakeholder records</li>
                    <li>All team member associations</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Type <span className="font-black text-red-400">{p.name}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => {
                      setConfirmName(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="Enter project name..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                    autoFocus
                  />
                </div>

                {deleteError && (
                  <p className="text-xs font-semibold text-red-400 bg-red-950/30 rounded-lg px-3 py-2">{deleteError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-800 px-6 py-4 flex items-center justify-end gap-3 bg-zinc-800/30">
                <button
                  onClick={() => setDeleteModal(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-all"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || confirmName.trim() !== p.name}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
