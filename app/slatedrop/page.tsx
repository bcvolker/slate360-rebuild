import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Box, Brush, Camera, ChevronRight, Compass, Folder, FolderOpen, Plus, Search, Share2, Upload } from "lucide-react";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { shouldHideInAppStoreMode } from "@/lib/app-store-mode";

export const metadata = {
  title: "SlateDrop — Slate360",
};

type AppFolder = {
  slug: string;
  label: string;
  active: boolean;
  icon: typeof Camera;
  folders: string[];
};

export default async function SlateDropPage() {
  const { user, orgId, tier, isBetaApproved } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/slatedrop");
  if (!isBetaApproved) redirect("/beta-pending");

  const entitlements = await resolveOrgEntitlements(orgId);
  const appFolders: AppFolder[] = [
    {
      slug: "site-walk-files",
      label: "Site Walk Files",
      active: entitlements.canAccessStandalonePunchwalk || entitlements.canAccessHub,
      icon: Camera,
      folders: ["Walk Sessions", "Photos", "Plans", "Markups", "Voice Notes", "Deliverables"],
    },
    {
      slug: "360-tour-files",
      label: "360 Tour Files",
      active: entitlements.canAccessStandaloneTourBuilder || entitlements.canAccessTourBuilder,
      icon: Compass,
      folders: ["Panoramas", "Scenes", "Hotspots", "Tour Exports"],
    },
    {
      slug: "design-studio-files",
      label: "Design Studio Files",
      active: entitlements.canAccessStandaloneDesignStudio || entitlements.canAccessDesignStudio,
      icon: Box,
      folders: ["Models", "Drawings", "Review Attachments", "Exports"],
    },
    {
      slug: "content-studio-files",
      label: "Content Studio Files",
      active: entitlements.canAccessStandaloneContentStudio || entitlements.canAccessContent,
      icon: Brush,
      folders: ["Raw Media", "Edits", "Branded Exports", "Campaign Assets"],
    },
  ];
  const visibleAppFolders = appFolders.filter((folder) => !shouldHideInAppStoreMode(!folder.active));
  const browseRows = [
    { href: "/slatedrop/general-files", label: "General Files", meta: "Uploads, received, shared, archive", icon: FolderOpen },
    ...visibleAppFolders
      .filter((folder) => folder.active)
      .map((folder) => ({ href: `/slatedrop/${folder.slug}`, label: folder.label, meta: folder.folders.slice(0, 3).join(" · "), icon: folder.icon })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">SlateDrop</p>
          <h1 className="truncate text-2xl font-black text-white">Files</h1>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton href="/slatedrop/upload" icon={Upload} label="Upload" />
          <ActionButton href="/slatedrop/new-folder" icon={Plus} label="New" />
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-lg backdrop-blur-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/45 pl-10 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" placeholder="Search files" />
        </div>
      </section>

      <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 shadow-lg backdrop-blur-md" aria-label="SlateDrop sections">
        <SegmentLink href="/slatedrop" label="Browse" active />
        <SegmentLink href="/slatedrop/recents" label="Recents" />
        <SegmentLink href="/slatedrop/shared" label="Shared" />
        <SegmentLink href="/slatedrop/requests" label="Requests" />
      </nav>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-md">
        {browseRows.map((row) => <FileRow key={row.href} {...row} />)}
        <div className="border-t border-white/10 px-4 py-3 text-xs font-bold text-slate-500">
          Storage: {entitlements.maxStorageGB}GB
        </div>
      </section>
    </div>
  );
}

function ActionButton({ href, icon: Icon, label }: { href: string; icon: typeof Plus; label: string }) {
  return <Link href={href} className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-xs font-black text-white shadow-[0_0_15px_rgba(37,99,235,0.25)] hover:bg-blue-500"><Icon className="h-4 w-4" /> {label}</Link>;
}

function SegmentLink({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return <Link href={href} className={`rounded-xl px-2 py-2 text-center text-xs font-black ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{label}</Link>;
}

function FileRow({ href, label, meta, icon: Icon }: { href: string; label: string; meta: string; icon: typeof Folder }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 transition hover:bg-blue-500/10">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-white">{label}</span>
        <span className="block truncate text-xs font-bold text-slate-400">{meta}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-500" />
    </Link>
  );
}
