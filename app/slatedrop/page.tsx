import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Box, Brush, Camera, ChevronRight, Compass, FolderOpen, HardDrive, Lock, Upload } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { getProjectLabels } from "@/lib/projects/labels";

export const metadata = {
  title: "SlateDrop — Slate360",
};

type ProjectRow = {
  id: string;
  name: string | null;
  status: string | null;
};

type AppFolder = {
  label: string;
  detail: string;
  href: string;
  active: boolean;
  icon: typeof Camera;
};

async function loadProjects(userId: string, orgId: string | null): Promise<ProjectRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("projects")
    .select("id, name, status")
    .order("created_at", { ascending: false })
    .limit(8);

  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", userId);
  const { data } = await query;
  return (data ?? []) as ProjectRow[];
}

export default async function SlateDropPage() {
  const { user, orgId, tier, isBetaApproved } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/slatedrop");
  if (!isBetaApproved) redirect("/beta-pending");

  const [entitlements, projects] = await Promise.all([
    resolveOrgEntitlements(orgId),
    loadProjects(user.id, orgId),
  ]);
  const labels = getProjectLabels(tier);
  const appFolders: AppFolder[] = [
    {
      label: "Site Walk",
      detail: "Walk photos, plans, voice notes, markups, reports",
      href: "/site-walk",
      active: entitlements.canAccessStandalonePunchwalk || entitlements.canAccessHub,
      icon: Camera,
    },
    {
      label: "360 Tours",
      detail: "Panoramas, scenes, hotspots, tour exports",
      href: "/apps/360-tour-builder",
      active: entitlements.canAccessStandaloneTourBuilder || entitlements.canAccessTourBuilder,
      icon: Compass,
    },
    {
      label: "Design Studio",
      detail: "Models, drawings, design review attachments",
      href: "/apps/design-studio",
      active: entitlements.canAccessStandaloneDesignStudio || entitlements.canAccessDesignStudio,
      icon: Box,
    },
    {
      label: "Content Studio",
      detail: "Edited media, branded exports, campaign assets",
      href: "/apps/content-studio",
      active: entitlements.canAccessStandaloneContentStudio || entitlements.canAccessContent,
      icon: Brush,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">SlateDrop</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Your file hub</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Open a {labels.singularLower} folder, route uploads into app-specific spaces, and share files from one mobile-friendly hub.
            </p>
          </div>
          <Link href="/projects" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
            <FolderOpen className="h-4 w-4" /> Open {labels.plural}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {appFolders.map((folder) => {
          const Icon = folder.icon;
          return (
            <Link
              key={folder.label}
              href={folder.active ? folder.href : "/my-account?tab=billing"}
              className="min-h-[152px] rounded-3xl border border-slate-300 bg-white p-4 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${folder.active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
                  {folder.active ? "Active" : <><Lock className="h-3 w-3" /> Upgrade</>}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-black text-slate-950">{folder.label}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">{folder.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">{labels.plural} file spaces</h2>
            <p className="text-sm text-slate-600">Each {labels.singularLower} opens a full folder system with app-specific routing.</p>
          </div>
          <HardDrive className="h-5 w-5 text-blue-700" />
        </div>

        {projects.length > 0 ? (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}/slatedrop`} className="flex min-h-14 items-center justify-between gap-3 bg-white px-4 py-3 transition-colors hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{project.name ?? labels.singular}</p>
                  <p className="text-xs text-slate-500">{project.status ?? "Active"} · Photos, plans, deliverables, shared uploads</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <Upload className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-800">No {labels.pluralLower} yet</p>
            <p className="mt-1 text-sm text-slate-600">Create a {labels.singularLower} to unlock folders for Site Walk, SlateDrop, and subscribed apps.</p>
          </div>
        )}
      </section>
    </div>
  );
}
