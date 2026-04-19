import Link from "next/link";
import { ArrowRight, Building2, Camera, ClipboardList, FileText, FolderOpen, MapPin } from "lucide-react";

type ProjectLocation = {
  label: string;
};

type ProjectInfo = {
  id: string;
  status: string | null;
  description: string | null;
  created_at: string | null;
};

type SnapshotFile = {
  id: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
};

type PunchItem = {
  id: string;
  number: number | null;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
};

type PunchSummary = {
  total: number;
  open: number;
  inProgress: number;
  review: number;
  closed: number;
};

type ProjectDetailOverviewProps = {
  project: ProjectInfo;
  projectType: string | null;
  contractType: string | null;
  location: ProjectLocation;
  statusNotes: string[];
  recentFiles: SnapshotFile[];
  photoCount: number;
  recentPhotos: SnapshotFile[];
  punchSummary: PunchSummary;
  activePunchItems: PunchItem[];
};

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProjectDetailOverview({
  project,
  projectType,
  contractType,
  location,
  statusNotes,
  recentFiles,
  photoCount,
  recentPhotos,
  punchSummary,
  activePunchItems,
}: ProjectDetailOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-2xl border border-app bg-app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-white">
              <Building2 size={16} className="text-[#3B82F6]" /> Project Info
            </h2>
            <span className="rounded-full border border-app bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
              {project.status ?? "Active"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-app bg-white/[0.04]/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Created</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatDate(project.created_at)}</p>
            </div>
            <div className="rounded-xl border border-app bg-white/[0.04]/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project Type</p>
              <p className="mt-1 text-sm font-semibold text-white">{projectType ?? "Not set"}</p>
            </div>
            <div className="rounded-xl border border-app bg-white/[0.04]/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Contract Type</p>
              <p className="mt-1 text-sm font-semibold text-white">{contractType ?? "Not set"}</p>
            </div>
            <div className="rounded-xl border border-app bg-white/[0.04]/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Location</p>
              <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-white">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#3B82F6]" />
                <span>{location.label || "Not set"}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-app-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-white">
            <FileText size={16} className="text-[#3B82F6]" /> Project Notes / Status Notes
          </h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-app bg-white/[0.04]/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Project Notes</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{project.description?.trim() || "No project notes yet."}</p>
            </div>

            <div className="rounded-xl border border-app bg-white/[0.04]/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status Notes</p>
              {statusNotes.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                  {statusNotes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">No status notes yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-app bg-app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-white">
              <FolderOpen size={16} className="text-[#3B82F6]" /> SlateDrop Snapshot
            </h2>
            <Link href={`/projects/${project.id}/slatedrop`} className="text-xs font-bold text-[#3B82F6] hover:underline">
              Open SlateDrop →
            </Link>
          </div>

          {recentFiles.length > 0 ? (
            <div className="mt-4 space-y-2">
              {recentFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/projects/${project.id}/slatedrop`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-app bg-white/[0.04]/50 px-4 py-3 transition-colors hover:border-[#3B82F6]/30 hover:bg-[#3B82F6]/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{file.file_name}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {formatBytes(file.file_size)} · {formatDate(file.created_at)}
                    </p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-zinc-500" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-app bg-white/[0.04]/30 p-6 text-sm text-zinc-400">
              No project files yet. Open SlateDrop to upload into this project.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-app bg-app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-white">
              <Camera size={16} className="text-[#3B82F6]" /> Photos Snapshot
            </h2>
            <Link href={`/projects/${project.id}/photos`} className="text-xs font-bold text-[#3B82F6] hover:underline">
              Open Photos →
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-app bg-white/[0.04]/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Photos</p>
            <p className="mt-1 text-2xl font-black text-white">{photoCount}</p>
          </div>

          {recentPhotos.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {recentPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  href={`/projects/${project.id}/photos`}
                  className="rounded-xl border border-app bg-white/[0.04]/50 p-3 transition-colors hover:border-[#3B82F6]/30 hover:bg-[#3B82F6]/10"
                >
                  <p className="truncate text-sm font-semibold text-white">{photo.file_name}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{formatDate(photo.created_at)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No photos uploaded yet.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-app bg-app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-black text-white">
            <ClipboardList size={16} className="text-[#3B82F6]" /> Punch List Summary
          </h2>
          <Link href={`/projects/${project.id}/punch-list`} className="text-xs font-bold text-[#3B82F6] hover:underline">
            Open Punch List →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total", value: punchSummary.total },
            { label: "Open", value: punchSummary.open },
            { label: "In Progress", value: punchSummary.inProgress },
            { label: "Review", value: punchSummary.review },
            { label: "Closed", value: punchSummary.closed },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-app bg-white/[0.04]/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {activePunchItems.length > 0 ? (
          <div className="mt-4 space-y-2">
            {activePunchItems.map((item) => (
              <Link
                key={item.id}
                href={`/projects/${project.id}/punch-list`}
                className="flex items-center justify-between gap-3 rounded-xl border border-app bg-white/[0.04]/50 px-4 py-3 transition-colors hover:border-[#3B82F6]/30 hover:bg-[#3B82F6]/10"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    #{item.number ?? "—"} · {item.title}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {item.status ?? "Open"}
                    {item.priority ? ` · ${item.priority}` : ""}
                    {item.due_date ? ` · Due ${formatDate(item.due_date)}` : ""}
                  </p>
                </div>
                <ArrowRight size={14} className="shrink-0 text-zinc-500" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-app bg-white/[0.04]/30 p-6 text-sm text-zinc-400">
            No active punch list items yet.
          </div>
        )}
      </section>
    </div>
  );
}