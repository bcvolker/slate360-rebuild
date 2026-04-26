import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Archive, Box, Brush, Camera, Compass, Download, FileInput, Folder, FolderOpen, HardDrive, Lock, Mail, Plus, Share2, Upload } from "lucide-react";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { getProjectLabels } from "@/lib/projects/labels";

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">SlateDrop Folder System</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Files organized by folder, not app launchers</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              This is the new mobile-first folder map. Legacy {labels.pluralLower} are intentionally hidden here until the new Site Walk folder model is wired.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            <HardDrive className="h-4 w-4 text-blue-700" /> {entitlements.maxStorageGB}GB storage
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-blue-300 bg-blue-50 p-4 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
              <FolderOpen className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">General</span>
          </div>
          <h2 className="mt-4 text-sm font-black text-slate-950">General Files</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Uploads, received files, shared links, archive, and custom folders.</p>
          <FolderPreview baseSlug="general-files" folders={["Uploads", "Received", "Shared", "Archive"]} />
          <OpenFolderLink href="/slatedrop/general-files" label="Open General Files" />
        </div>

        {appFolders.map((folder) => {
          const Icon = folder.icon;
          return (
            <div
              key={folder.label}
              className={`rounded-3xl border p-4 shadow-sm transition-all hover:border-blue-500 hover:shadow-md active:scale-[0.99] ${folder.active ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50 opacity-75"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${folder.active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
                  {folder.active ? "Folder" : <><Lock className="h-3 w-3" /> Locked</>}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-black text-slate-950">{folder.label}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">{folder.detail}</p>
              <FolderPreview baseSlug={folder.slug} folders={folder.folders} locked={!folder.active} />
              <OpenFolderLink href={folder.active ? `/slatedrop/${folder.slug}` : "/my-account?tab=billing"} label={folder.active ? `Open ${folder.label}` : "Manage access"} />
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Folder actions</h2>
            <p className="text-sm text-slate-600">These are the actions the new browser must support once the Site Walk folder model is finalized.</p>
          </div>
          <Folder className="h-5 w-5 text-blue-700" />
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
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm font-bold text-slate-800">Project folders are paused in this hub for now.</p>
          <p className="mx-auto mt-1 max-w-2xl text-sm text-slate-600">
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
        <Link key={name} href={locked ? "/my-account?tab=billing" : `/slatedrop/${baseSlug}/${toSlug(name)}`} className="flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-white">
          {locked ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Folder className="h-3.5 w-3.5 text-blue-700" />}
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
    <Link href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-2 text-center text-xs font-bold text-slate-700 transition-all hover:border-blue-500 hover:bg-white active:scale-[0.98]">
      <Icon className="h-5 w-5 text-blue-700" />
      {label}
    </Link>
  );
}
