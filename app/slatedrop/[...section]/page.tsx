import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, Folder, Mail, MoreHorizontal, Pencil, Plus, Share2, Trash2, Upload } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "SlateDrop Folder — Slate360",
};

const ACTION_COPY: Record<string, { title: string; detail: string }> = {
  "new-folder": { title: "New folder", detail: "Create a custom folder once the final Site Walk folder model is wired." },
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <Link href="/slatedrop" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-blue-500">
        <ArrowLeft className="h-4 w-4" /> SlateDrop
      </Link>

      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">{parent}</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{detail}</p>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <FolderAction icon={Upload} label="Upload" />
          <FolderAction icon={Download} label="Save" />
          <FolderAction icon={Share2} label="Share" />
          <FolderAction icon={Mail} label="Send" />
          <FolderAction icon={Pencil} label="Rename" />
          <FolderAction icon={MoreHorizontal} label="More" />
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <Folder className="mx-auto h-8 w-8 text-blue-700" />
        <p className="mt-3 text-sm font-bold text-slate-800">Folder browser placeholder</p>
        <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
          This keeps every SlateDrop control clickable while we replace the legacy project-scoped file explorer with the new Site Walk-driven folder browser.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600">No legacy project UI</span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600">Mobile-first actions</span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600">Ready for Site Walk folders</span>
        </div>
      </section>
    </div>
  );
}

function FolderAction({ icon: Icon, label }: { icon: typeof Plus; label: string }) {
  return (
    <button type="button" className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-700">
      <Icon className="h-5 w-5 text-blue-700" />
      {label}
    </button>
  );
}
