import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, Folder, Mail, MoreHorizontal, Pencil, Plus, Share2, Upload } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import SlateDropDesktopDropZone from "@/components/slatedrop/SlateDropDesktopDropZone";
import GlassCard from "@/components/shared/GlassCard";

export const metadata = {
  title: "SlateDrop Folder — Slate360",
};

const ACTION_COPY: Record<string, { title: string; detail: string }> = {
  "new-folder": { title: "New folder", detail: "Create a custom folder for project files, plans, photos, or reports." },
  upload: { title: "Upload", detail: "Add photos, plans, reports, and received files into the selected folder." },
  save: { title: "Save", detail: "Save or download selected files to your device." },
  share: { title: "Share", detail: "Share selected files through contacts, text, email, or native share." },
  send: { title: "Send", detail: "Secure-send files to stakeholders with expiring links." },
  receive: { title: "Receive", detail: "Generate intake links so collaborators can upload into the right folder." },
  archive: { title: "Archive", detail: "Move completed or old records into an archive folder." },
  move: { title: "Move", detail: "Move files between SlateDrop folders without breaking project records." },
};

function titleFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SlateDropSectionPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { user, isBetaApproved } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/slatedrop");
  if (!isBetaApproved) redirect("/beta-pending");

  const section = (await params).section ?? [];
  if (section.length === 0) notFound();

  const [root, child] = section;
  const action = ACTION_COPY[root];
  const title = action?.title ?? titleFromSlug(child ?? root);
  const parent = action ? "SlateDrop Actions" : titleFromSlug(root);
  const detail = action?.detail ?? "This folder is ready for the new mobile-first browser. Real files and actions will be wired through the existing SlateDrop APIs.";
  const folderId = section.join("/");
  const folderPath = ["SlateDrop", ...section.map(titleFromSlug)].join("/");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <Link href="/slatedrop" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-slate-200 hover:border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] hover:bg-white/10">
        <ArrowLeft className="h-4 w-4" /> SlateDrop
      </Link>

      <GlassCard className="p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--graphite-primary)]">{parent}</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{detail}</p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <FolderAction href="/slatedrop/upload" icon={Upload} label="Upload" />
          <FolderAction href="/slatedrop/save" icon={Download} label="Save" />
          <FolderAction href="/slatedrop/share" icon={Share2} label="Share" />
          <FolderAction href="/slatedrop/send" icon={Mail} label="Send" />
          <FolderAction href="/slatedrop/new-folder" icon={Pencil} label="New folder" />
          <FolderAction href="/slatedrop/move" icon={MoreHorizontal} label="More" />
        </div>
      </GlassCard>

      {action && root !== "upload" && <ActionState title={title} />}

      {(root === "upload" || !action) && (
        <SlateDropDesktopDropZone
          folderId={folderId}
          folderPath={folderPath}
          label={root === "upload" ? "Desktop drag-and-drop upload" : `Drop files into ${title}`}
        />
      )}

      <GlassCard className="border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
        <Folder className="mx-auto h-8 w-8 text-[var(--graphite-primary)]" />
        <p className="mt-3 text-sm font-bold text-white">No files selected</p>
        <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-400">
          Open a project folder or upload files to use SlateDrop actions from this workspace.
        </p>
      </GlassCard>
    </div>
  );
}

function ActionState({ title }: { title: string }) {
  return (
    <GlassCard className="border-[color-mix(in_srgb,var(--graphite-primary)_24%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--graphite-primary)]">{title}</p>
      <h2 className="mt-2 text-lg font-black text-white">Select files first</h2>
      <p className="mt-1 text-sm leading-6 text-slate-300">Open a folder with files, then run this action from the file toolbar or context menu.</p>
    </GlassCard>
  );
}

function FolderAction({ href, icon: Icon, label }: { href: string; icon: typeof Plus; label: string }) {
  return (
    <Link href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-slate-300 hover:border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] hover:bg-white/10">
      <Icon className="h-5 w-5 text-[var(--graphite-primary)]" />
      {label}
    </Link>
  );
}
