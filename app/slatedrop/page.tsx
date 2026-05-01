import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Archive, Box, Brush, Camera, Compass, Download, FileInput, Folder, FolderOpen, HardDrive, Lock, Mail, Plus, Share2, Upload } from "lucide-react";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { getProjectLabels } from "@/lib/projects/labels";
import { shouldHideInAppStoreMode } from "@/lib/app-store-mode";

export const metadata = {
  title: "SlateDrop — Slate360",
};

type AppFolder = {
  slug: string;
  label: string;
  detail: string;
  active: boolean;
  icon: typeof Camera;
  folders: string[];
};

export default async function SlateDropPage() {
  const { user, orgId, tier, isBetaApproved } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/slatedrop");
  if (!isBetaApproved) redirect("/beta-pending");

  const entitlements = await resolveOrgEntitlements(orgId);
  const labels = getProjectLabels(tier);
  const appFolders: AppFolder[] = [
    {
      slug: "site-walk-files",
      label: "Site Walk Files",
      detail: "Walk photos, plans, voice notes, markups, reports",
      active: entitlements.canAccessStandalonePunchwalk || entitlements.canAccessHub,
      icon: Camera,
      folders: ["Walk Sessions", "Photos", "Plans", "Markups", "Voice Notes", "Deliverables"],
    },
    {
      slug: "360-tour-files",
      label: "360 Tour Files",
      detail: "Panoramas, scenes, hotspots, tour exports",
      active: entitlements.canAccessStandaloneTourBuilder || entitlements.canAccessTourBuilder,
      icon: Compass,
      folders: ["Panoramas", "Scenes", "Hotspots", "Tour Exports"],
    },
    {
      slug: "design-studio-files",
      label: "Design Studio Files",
      detail: "Models, drawings, design review attachments",
      active: entitlements.canAccessStandaloneDesignStudio || entitlements.canAccessDesignStudio,
      icon: Box,
      folders: ["Models", "Drawings", "Review Attachments", "Exports"],
    },
    {
      slug: "content-studio-files",
      label: "Content Studio Files",
      detail: "Edited media, branded exports, campaign assets",
      active: entitlements.canAccessStandaloneContentStudio || entitlements.canAccessContent,
      icon: Brush,
      folders: ["Raw Media", "Edits", "Branded Exports", "Campaign Assets"],
    },
  ];
  const visibleAppFolders = appFolders.filter((folder) => !shouldHideInAppStoreMode(!folder.active));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 text-slate-50 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">SlateDrop</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Files, folders, uploads, and shares</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Browse general files and active app folders from one contained file hub. In review mode, inactive future app spaces stay hidden.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm font-bold text-slate-300">
            <HardDrive className="h-4 w-4 text-blue-200" /> {entitlements.maxStorageGB}GB storage
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-blue-400/40 bg-blue-500/10 p-4 shadow-lg backdrop-blur-md transition-all hover:border-blue-300/70">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <FolderOpen className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-100 ring-1 ring-white/15">General</span>
          </div>
          <h2 className="mt-4 text-sm font-black text-white">General Files</h2>
          <p className="mt-1 text-xs leading-5 text-slate-300">Uploads, received files, shared links, archive, and custom folders.</p>
          <FolderPreview baseSlug="general-files" folders={["Uploads", "Received", "Shared", "Archive"]} />
          <OpenFolderLink href="/slatedrop/general-files" label="Open General Files" />
        </div>

        {visibleAppFolders.map((folder) => {
          const Icon = folder.icon;
          return (
            <div
              key={folder.label}
              className={`rounded-3xl border p-4 shadow-lg backdrop-blur-md transition-all hover:border-blue-400/70 hover:bg-blue-500/10 active:scale-[0.99] ${folder.active ? "border-white/10 bg-white/5" : "border-white/10 bg-white/5 opacity-75"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${folder.active ? "bg-emerald-300/10 text-emerald-100 ring-1 ring-emerald-300/20" : "bg-white/10 text-slate-300 ring-1 ring-white/15"}`}>
                  {folder.active ? "Folder" : <><Lock className="h-3 w-3" /> Locked</>}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-black text-white">{folder.label}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">{folder.detail}</p>
              <FolderPreview baseSlug={folder.slug} folders={folder.folders} locked={!folder.active} />
              <OpenFolderLink href={folder.active ? `/slatedrop/${folder.slug}` : "/my-account?tab=billing"} label={folder.active ? `Open ${folder.label}` : "Manage access"} />
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">Folder actions</h2>
            <p className="text-sm text-slate-400">Upload, share, receive, archive, and organize files without leaving the app shell.</p>
          </div>
          <Folder className="h-5 w-5 text-blue-200" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <ActionPill href="/slatedrop/new-folder" icon={Plus} label="New folder" />
          <ActionPill href="/slatedrop/upload" icon={Upload} label="Upload" />
          <ActionPill href="/slatedrop/save" icon={Download} label="Save" />
          <ActionPill href="/slatedrop/share" icon={Share2} label="Share" />
          <ActionPill href="/slatedrop/send" icon={Mail} label="Send" />
          <ActionPill href="/slatedrop/receive" icon={FileInput} label="Receive" />
          <ActionPill href="/slatedrop/archive" icon={Archive} label="Archive" />
          <ActionPill href="/slatedrop/move" icon={FolderOpen} label="Move" />
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-slate-950/45 px-4 py-6 text-center">
          <p className="text-sm font-bold text-white">Project folders are paused in this hub for now.</p>
          <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-400">
            Existing test {labels.pluralLower} are not deleted, but they are hidden here so the new SlateDrop experience can be driven by the Site Walk architecture instead of old legacy project folders.
          </p>
        </div>
      </section>
    </div>
  );
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function FolderPreview({ baseSlug, folders, locked = false }: { baseSlug: string; folders: string[]; locked?: boolean }) {
  return (
    <div className="mt-4 space-y-1.5">
      {folders.slice(0, 4).map((name) => (
        <Link key={name} href={locked ? "/my-account?tab=billing" : `/slatedrop/${baseSlug}/${toSlug(name)}`} className="flex min-h-9 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/45 px-2.5 text-xs font-semibold text-slate-300 hover:border-blue-400/70 hover:bg-blue-500/10">
          {locked ? <Lock className="h-3.5 w-3.5 text-slate-500" /> : <Folder className="h-3.5 w-3.5 text-blue-200" />}
          <span className="truncate">{name}</span>
        </Link>
      ))}
    </div>
  );
}

function OpenFolderLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-blue-700 px-3 text-xs font-black text-white transition hover:bg-blue-800 active:scale-[0.99]">
      {label}
    </Link>
  );
}

function ActionPill({ href, icon: Icon, label }: { href: string; icon: typeof Plus; label: string }) {
  return (
    <Link href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 px-2 text-center text-xs font-bold text-slate-300 transition-all hover:border-blue-400/70 hover:bg-blue-500/10 active:scale-[0.98]">
      <Icon className="h-5 w-5 text-blue-200" />
      {label}
    </Link>
  );
}
